import { getCurrentScope, onScopeDispose, ref, watch } from "vue";

/**
 * Autocomplete rule types
 */
export type AutocompleteType =
  | "url"
  | "email"
  | "markdown"
  | "smartQuote"
  | "emoji"
  | "smartPunctuation";

/**
 * Autocomplete result
 */
export interface AutocompleteResult {
  type: AutocompleteType;
  original: string;
  replacement: string;
  cursorOffset?: number;
}

/**
 * Markdown shortcut configuration
 */
export interface MarkdownShortcut {
  trigger: string;
  pattern: RegExp;
  replacement: (match: RegExpMatchArray) => string;
  /**
   * Optional veto on a pattern match, for constraints a plain RegExp cannot
   * express without lookbehind (unsupported on Safari < 16.4, which we
   * target). E.g. the single-asterisk italic rule must not fire on the inner
   * span of a still-being-typed `**bold**` marker. For global patterns,
   * detection keeps scanning for a later match when the guard rejects one.
   */
  guard?: (text: string, match: RegExpMatchArray) => boolean;
  cursorOffset?: number;
  description: string;
}

/**
 * Smart autocomplete options
 */
export interface SmartAutocompleteOptions {
  enableUrlLinking?: boolean;
  enableEmailLinking?: boolean;
  enableSmartQuotes?: boolean;
  enableMarkdownShortcuts?: boolean;
  enableEmoji?: boolean;
  enableSmartPunctuation?: boolean;
}

/**
 * Tags that must never be nested inside a `<p>`: a paragraph's content model
 * is phrasing content only, so the HTML parser splits the `<p>` around them
 * on the next serialize/parse round-trip (reload, import, v-model re-render),
 * silently diverging persisted content from what was authored.
 */
const BLOCK_LEVEL_TAG = /^(?:H[1-6]|P|DIV|UL|OL|BLOCKQUOTE|PRE|HR|TABLE|FIGURE)$/;

/**
 * Whether a parsed replacement fragment contains any block-level element at
 * its top level (e.g. the `<h1>` produced by the "# " markdown shortcut).
 */
const fragmentHasBlockLevel = (fragment: DocumentFragment): boolean => {
  for (let child = fragment.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      BLOCK_LEVEL_TAG.test((child as Element).tagName)
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Nearest `<p>` ancestor of `node` strictly inside `editor`, or null.
 */
const closestParagraph = (
  node: Node,
  editor: HTMLElement
): HTMLElement | null => {
  let el = node.parentElement;
  while (el && el !== editor) {
    if (el.tagName === "P") return el;
    el = el.parentElement;
  }
  return null;
};

/**
 * Whether a container still holds anything worth keeping: any text, or any
 * element other than a bare `<br>` placeholder.
 */
const hasRenderableContent = (
  container: DocumentFragment | HTMLElement
): boolean =>
  (container.textContent || "") !== "" ||
  container.querySelector(":not(br)") !== null;

/**
 * Professional smart autocomplete system
 *
 * Inspired by:
 * - Notion's markdown shortcuts
 * - Google Docs smart compose
 * - Grammarly smart suggestions
 * - Slack emoji autocomplete
 *
 * Features:
 * - URL auto-linking with protocol detection
 * - Email auto-linking
 * - Smart quotes (straight to curly)
 * - Markdown shortcuts (# → heading, * → bold, etc.)
 * - Emoji shortcuts (:smile: → 😊)
 * - Smart punctuation (-- → em dash, ... → ellipsis)
 * - Real-time detection and replacement
 */
export function useSmartAutocomplete(
  editorRef: { value: HTMLElement | null },
  options: SmartAutocompleteOptions = {}
) {
  const {
    enableUrlLinking = true,
    enableEmailLinking = true,
    enableSmartQuotes = true,
    enableMarkdownShortcuts = true,
    enableEmoji = true,
    enableSmartPunctuation = true,
  } = options;

  // State
  const lastInput = ref("");
  const autocompleteHistory = ref<AutocompleteResult[]>([]);

  // Re-entrancy guard: applying a replacement dispatches an "input" event so
  // the host editor can sync v-model; that event must not re-trigger
  // handleInput synchronously.
  let isApplying = false;

  // ============================================
  // IME composition safety
  // ============================================
  //
  // While an IME composition session is active (CJK input methods, predictive
  // keyboards), applyAutocomplete's range.deleteContents() +
  // selection.removeAllRanges() would abort or corrupt the live composition
  // buffer. handleInput receives no event object (the host calls it bare), so
  // composition state is tracked internally by listening for
  // compositionstart/compositionend on the editor element itself.
  let isComposing = false;
  // An input that arrives mid-composition is deferred: one detection pass
  // runs when the composition commits. This also covers the listener-order
  // race where the host's compositionend-driven input handler fires before
  // our own compositionend listener has cleared the flag.
  let pendingCompositionInput = false;
  let compositionTarget: HTMLElement | null = null;

  const handleCompositionStart = () => {
    isComposing = true;
  };

  const handleCompositionEnd = () => {
    isComposing = false;
    if (pendingCompositionInput) {
      pendingCompositionInput = false;
      handleInput();
    }
  };

  const detachCompositionListeners = () => {
    if (compositionTarget) {
      compositionTarget.removeEventListener(
        "compositionstart",
        handleCompositionStart
      );
      compositionTarget.removeEventListener(
        "compositionend",
        handleCompositionEnd
      );
      compositionTarget = null;
    }
  };

  /**
   * (Re)binds the composition listeners to the current editor element.
   * Idempotent — safe to call on every handleInput as a fallback for
   * non-reactive editorRef objects.
   */
  const ensureCompositionListeners = () => {
    const editor = editorRef.value;
    if (editor === compositionTarget) return;
    detachCompositionListeners();
    if (editor) {
      compositionTarget = editor;
      editor.addEventListener("compositionstart", handleCompositionStart);
      editor.addEventListener("compositionend", handleCompositionEnd);
    }
  };

  // Bind eagerly. In the normal case editorRef is a reactive template ref
  // (null during setup, set on mount) so the watcher attaches the listeners
  // before the first keystroke; `immediate` covers plain-object refs whose
  // element already exists at composable creation.
  watch(() => editorRef.value, ensureCompositionListeners, {
    immediate: true,
  });

  if (getCurrentScope()) {
    onScopeDispose(detachCompositionListeners);
  }

  // ============================================
  // URL Auto-linking
  // ============================================

  /**
   * URL pattern matching
   * Matches: http://, https://, www., domain.com
   */
  const urlPattern =
    /\b(?:https?:\/\/|www\.)[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi;

  /**
   * Detect and convert URLs to links.
   *
   * Only fires once the user has typed a boundary character (space) after the
   * URL — converting on every keystroke would linkify half-typed addresses
   * (e.g. "www.example.c" the moment it matches the pattern). The boundary
   * character is included in `original`/`replacement` so the matched span
   * still ends exactly at the caret, as applyAutocomplete requires.
   */
  const detectUrl = (text: string): AutocompleteResult | null => {
    if (!enableUrlLinking) return null;

    const boundary = text.match(/([\u0020\u00a0])$/);
    if (!boundary) return null;
    const body = text.slice(0, -1);

    const matches = body.match(urlPattern);
    if (!matches) return null;

    const url = matches[matches.length - 1];
    // The URL must sit immediately before the just-typed boundary.
    if (!body.endsWith(url)) return null;

    let href = url;

    // Add protocol if missing
    if (!url.startsWith("http")) {
      href = "https://" + url;
    }

    return {
      type: "url",
      original: url + boundary[1],
      replacement: `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>${boundary[1]}`,
    };
  };

  // ============================================
  // Email Auto-linking
  // ============================================

  /**
   * Email pattern matching
   */
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  /**
   * Detect and convert emails to mailto links. Gated behind a just-typed
   * boundary character like detectUrl, so half-typed addresses never convert.
   */
  const detectEmail = (text: string): AutocompleteResult | null => {
    if (!enableEmailLinking) return null;

    const boundary = text.match(/([\u0020\u00a0])$/);
    if (!boundary) return null;
    const body = text.slice(0, -1);

    const matches = body.match(emailPattern);
    if (!matches) return null;

    const email = matches[matches.length - 1];
    // The email must sit immediately before the just-typed boundary.
    if (!body.endsWith(email)) return null;

    return {
      type: "email",
      original: email + boundary[1],
      replacement: `<a href="mailto:${email}">${email}</a>${boundary[1]}`,
    };
  };

  // ============================================
  // Smart Quotes
  // ============================================

  /**
   * Convert straight quotes to curly quotes
   * Rules:
   * - Opening quote after space or start: " → "
   * - Closing quote before space or end: " → "
   * - Same for single quotes: ' → ' or '
   */
  const convertSmartQuotes = (text: string): AutocompleteResult | null => {
    if (!enableSmartQuotes) return null;

    // Double quotes
    if (text.includes('"')) {
      let converted = text;

      // Opening double quote (after space or start) - curly (U+201C)
      converted = converted.replace(/(^|\s)"/g, "$1“");

      // Closing double quote (before space, punctuation, or end) - curly (U+201D)
      converted = converted.replace(/"($|\s|[.,!?;:])/g, "”$1");

      if (converted !== text) {
        return {
          type: "smartQuote",
          original: text,
          replacement: converted,
        };
      }
    }

    // Single quotes (apostrophes)
    if (text.includes("'")) {
      let converted = text;

      // Opening single quote (after space or start) - using hex escape
      converted = converted.replace(/(^|\s)'/g, "$1\u2018");

      // Closing single quote / apostrophe - using hex escape
      converted = converted.replace(/'($|\s|[.,!?;:])/g, "\u2019$1");

      // Apostrophe in contractions (don't, it's, etc.) - using hex escape
      converted = converted.replace(/(\w)'(\w)/g, "$1\u2019$2");

      if (converted !== text) {
        return {
          type: "smartQuote",
          original: text,
          replacement: converted,
        };
      }
    }

    return null;
  };

  // ============================================
  // Markdown Shortcuts
  // ============================================

  /**
   * Markdown shortcuts configuration
   */
  const markdownShortcuts: MarkdownShortcut[] = [
    // Headers
    {
      trigger: "# ",
      pattern: /^#\s(.+)$/,
      replacement: (m) => `<h1>${m[1]}</h1>`,
      description: "Heading 1",
    },
    {
      trigger: "## ",
      pattern: /^##\s(.+)$/,
      replacement: (m) => `<h2>${m[1]}</h2>`,
      description: "Heading 2",
    },
    {
      trigger: "### ",
      pattern: /^###\s(.+)$/,
      replacement: (m) => `<h3>${m[1]}</h3>`,
      description: "Heading 3",
    },
    {
      trigger: "#### ",
      pattern: /^####\s(.+)$/,
      replacement: (m) => `<h4>${m[1]}</h4>`,
      description: "Heading 4",
    },

    // Lists
    {
      trigger: "- ",
      pattern: /^-\s(.+)$/,
      replacement: (m) => `<ul><li>${m[1]}</li></ul>`,
      description: "Bullet list",
    },
    {
      trigger: "* ",
      pattern: /^\*\s(.+)$/,
      replacement: (m) => `<ul><li>${m[1]}</li></ul>`,
      description: "Bullet list (alt)",
    },
    {
      trigger: "1. ",
      pattern: /^\d+\.\s(.+)$/,
      replacement: (m) => `<ol><li>${m[1]}</li></ol>`,
      description: "Numbered list",
    },
    {
      trigger: "[] ",
      pattern: /^\[\]\s(.+)$/,
      replacement: (m) =>
        `<ul class="checklist"><li><input type="checkbox">${m[1]}</li></ul>`,
      description: "Checklist",
    },
    {
      trigger: "[x] ",
      pattern: /^\[x\]\s(.+)$/i,
      replacement: (m) =>
        `<ul class="checklist"><li><input type="checkbox" checked>${m[1]}</li></ul>`,
      description: "Checked checklist",
    },

    // Inline formatting
    {
      trigger: "**",
      pattern: /\*\*([^*]+)\*\*/g,
      replacement: (m) => `<strong>${m[1]}</strong>`,
      description: "Bold",
    },
    {
      trigger: "*",
      pattern: /\*([^*]+)\*/g,
      // A single-asterisk span that touches another "*" is part of a bold
      // marker (possibly still being typed: "**bo*" must wait for the final
      // "*" so the bold rule can win) — never italicize it.
      guard: (text, match) => {
        const start = match.index ?? 0;
        return (
          text.charAt(start - 1) !== "*" &&
          text.charAt(start + match[0].length) !== "*"
        );
      },
      replacement: (m) => `<em>${m[1]}</em>`,
      description: "Italic",
    },
    {
      trigger: "~~",
      pattern: /~~([^~]+)~~/g,
      replacement: (m) => `<s>${m[1]}</s>`,
      description: "Strikethrough",
    },
    {
      trigger: "`",
      pattern: /`([^`]+)`/g,
      replacement: (m) => `<code>${m[1]}</code>`,
      description: "Inline code",
    },

    // Block elements
    {
      trigger: "> ",
      pattern: /^>\s(.+)$/,
      replacement: (m) => `<blockquote>${m[1]}</blockquote>`,
      description: "Blockquote",
    },
    {
      trigger: "```",
      pattern: /^```(\w+)?\n([\s\S]+?)\n```$/,
      replacement: (m) =>
        `<pre><code class="language-${m[1] || "plaintext"}">${
          m[2]
        }</code></pre>`,
      description: "Code block",
    },
    {
      trigger: "---",
      pattern: /^---$/,
      replacement: () => "<hr>",
      description: "Horizontal rule",
    },
  ];

  /**
   * Detect and apply markdown shortcuts
   */
  const detectMarkdown = (text: string): AutocompleteResult | null => {
    if (!enableMarkdownShortcuts) return null;

    for (const shortcut of markdownShortcuts) {
      const pattern = new RegExp(shortcut.pattern);
      let match = pattern.exec(text);
      // A guard can veto a match; for global patterns keep scanning for a
      // later occurrence that passes.
      while (match && shortcut.guard && !shortcut.guard(text, match)) {
        match = pattern.global ? pattern.exec(text) : null;
      }
      if (match) {
        const replacement = shortcut.replacement(match);
        return {
          type: "markdown",
          // Only the matched source span is replaced (for block patterns the
          // ^...$ anchors make match[0] the whole line; for inline patterns
          // like **bold** it is just the marked segment).
          original: match[0],
          replacement,
          cursorOffset: shortcut.cursorOffset,
        };
      }
    }

    return null;
  };

  // ============================================
  // Emoji Shortcuts
  // ============================================

  /**
   * Common emoji shortcuts
   */
  const emojiMap: Record<string, string> = {
    ":smile:": "😊",
    ":grin:": "😁",
    ":joy:": "😂",
    ":heart:": "❤️",
    ":thumbsup:": "👍",
    ":thumbsdown:": "👎",
    ":ok_hand:": "👌",
    ":clap:": "👏",
    ":pray:": "🙏",
    ":fire:": "🔥",
    ":star:": "⭐",
    ":sparkles:": "✨",
    ":100:": "💯",
    ":tada:": "🎉",
    ":rocket:": "🚀",
    ":bulb:": "💡",
    ":warning:": "⚠️",
    ":check:": "✓",
    ":x:": "✗",
    ":eyes:": "👀",
    ":thinking:": "🤔",
    ":shrug:": "🤷",
    ":wave:": "👋",
    ":point_right:": "👉",
    ":point_left:": "👈",
    ":arrow_right:": "→",
    ":arrow_left:": "←",
    ":arrow_up:": "↑",
    ":arrow_down:": "↓",
  };

  /**
   * Detect and convert emoji shortcuts
   */
  const detectEmoji = (text: string): AutocompleteResult | null => {
    if (!enableEmoji) return null;

    const emojiPattern = /:\w+:/g;
    const matches = text.match(emojiPattern);

    if (matches) {
      let converted = text;
      let hasReplacement = false;

      for (const match of matches) {
        if (emojiMap[match]) {
          converted = converted.replace(match, emojiMap[match]);
          hasReplacement = true;
        }
      }

      if (hasReplacement) {
        return {
          type: "emoji",
          original: text,
          replacement: converted,
        };
      }
    }

    return null;
  };

  // ============================================
  // Smart Punctuation
  // ============================================

  /**
   * Smart punctuation replacements
   */
  const punctuationMap: Record<string, string> = {
    "...": "…", // Ellipsis
    "--": "—", // Em dash
    "->": "→", // Right arrow
    "<-": "←", // Left arrow
    "=>": "⇒", // Right double arrow
    "<=": "⇐", // Left double arrow
    "(c)": "©", // Copyright
    "(r)": "®", // Registered
    "(tm)": "™", // Trademark
    "+-": "±", // Plus-minus
    "1/2": "½", // One half
    "1/4": "¼", // One quarter
    "3/4": "¾", // Three quarters
  };

  /**
   * Detect and apply smart punctuation
   */
  const detectSmartPunctuation = (text: string): AutocompleteResult | null => {
    if (!enableSmartPunctuation) return null;

    for (const [pattern, replacement] of Object.entries(punctuationMap)) {
      if (text.includes(pattern)) {
        const converted = text.replace(pattern, replacement);
        return {
          type: "smartPunctuation",
          original: text,
          replacement: converted,
        };
      }
    }

    return null;
  };

  // ============================================
  // Main Detection Logic
  // ============================================

  /**
   * Detect any autocomplete opportunity in text
   */
  const detectAutocomplete = (text: string): AutocompleteResult | null => {
    // Try detections in order of priority

    // 1. Markdown shortcuts (highest priority for block-level formatting)
    const markdown = detectMarkdown(text);
    if (markdown) return markdown;

    // 2. URLs and emails (important for linking)
    const url = detectUrl(text);
    if (url) return url;

    const email = detectEmail(text);
    if (email) return email;

    // 3. Emoji shortcuts (common in chat-style editing)
    const emoji = detectEmoji(text);
    if (emoji) return emoji;

    // 4. Smart punctuation
    const punctuation = detectSmartPunctuation(text);
    if (punctuation) return punctuation;

    // 5. Smart quotes (lowest priority, most subtle)
    const quotes = convertSmartQuotes(text);
    if (quotes) return quotes;

    return null;
  };

  /**
   * Apply autocomplete at the current caret position.
   *
   * `result.original` is the exact source text that was matched by detection;
   * it must end at the caret inside a single text node. That span is removed
   * and `result.replacement` is inserted in its place, so the source text is
   * never duplicated (e.g. "--" becomes "—", not "--—").
   *
   * Guards: if `original` is empty, the caret is not in a text node inside
   * the editor, or the text before the caret does not equal `original`,
   * nothing happens — skipping is always safer than corrupting content.
   */
  const applyAutocomplete = (result: AutocompleteResult) => {
    const editor = editorRef.value;
    if (!editor) return;
    if (!result.original) return;
    // Never mutate the DOM mid-composition: deleteContents/removeAllRanges
    // below would abort or corrupt the live IME buffer.
    if (isComposing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const caretRange = selection.getRangeAt(0);
    const node = caretRange.startContainer;
    const caretOffset = caretRange.startOffset;

    // Only operate on a caret inside a text node owned by the editor
    if (node.nodeType !== Node.TEXT_NODE) return;
    if (!editor.contains(node)) return;

    // The matched source text must end exactly at the caret
    const start = caretOffset - result.original.length;
    const nodeText = node.textContent || "";
    if (start < 0 || caretOffset > nodeText.length) return;
    if (nodeText.substring(start, caretOffset) !== result.original) return;

    // Remove exactly the matched source text
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, caretOffset);
    range.deleteContents();

    // Insert the replacement. url/email/markdown replacements are HTML
    // markup; the remaining types (smartQuote, emoji, smartPunctuation)
    // produce plain text and are inserted as text nodes so surrounding
    // characters like "<" or "&" are never re-parsed as markup.
    const isHtmlReplacement =
      result.type === "url" ||
      result.type === "email" ||
      result.type === "markdown";

    let lastInserted: Node | null = null;
    let insertedBlockLevel = false;
    if (isHtmlReplacement) {
      const template = document.createElement("template");
      template.innerHTML = result.replacement;
      lastInserted = template.content.lastChild;
      if (lastInserted) {
        const paragraph = fragmentHasBlockLevel(template.content)
          ? closestParagraph(node, editor)
          : null;
        if (paragraph && paragraph.parentNode) {
          // Block-level replacement typed inside a <p> (e.g. "# " heading).
          // A <p> cannot legally contain block elements, so instead of
          // nesting, convert the paragraph: move any content after the caret
          // into its own trailing paragraph, insert the block(s) as siblings,
          // and drop the source paragraph if the match consumed everything.
          const parent = paragraph.parentNode;
          const tailRange = document.createRange();
          tailRange.setStart(node, start);
          tailRange.setEnd(paragraph, paragraph.childNodes.length);
          const tail = tailRange.extractContents();

          const anchor = paragraph.nextSibling;
          parent.insertBefore(template.content, anchor);
          if (hasRenderableContent(tail)) {
            const tailParagraph = document.createElement("p");
            tailParagraph.appendChild(tail);
            parent.insertBefore(tailParagraph, anchor);
          }
          if (!hasRenderableContent(paragraph)) {
            parent.removeChild(paragraph);
          }
          insertedBlockLevel = true;
        } else {
          range.insertNode(template.content);
        }
      }
    } else if (result.replacement) {
      const textNode = document.createTextNode(result.replacement);
      lastInserted = textNode;
      range.insertNode(textNode);
    }

    // Set cursor position
    const newRange = document.createRange();
    if (lastInserted && result.cursorOffset !== undefined) {
      // Honor an explicit offset within the inserted content's last text node
      let target: Node = lastInserted;
      while (target.lastChild) {
        target = target.lastChild;
      }
      if (target.nodeType === Node.TEXT_NODE) {
        const length = target.textContent?.length ?? 0;
        newRange.setStart(
          target,
          Math.min(Math.max(result.cursorOffset, 0), length)
        );
      } else {
        newRange.setStartAfter(lastInserted);
      }
    } else if (lastInserted && insertedBlockLevel) {
      // Block conversion: place the caret at the end of the new block so
      // typing continues inside it (heading, list item, quote, ...)
      let target: Node = lastInserted;
      while (target.lastChild) {
        target = target.lastChild;
      }
      if (target.nodeType === Node.TEXT_NODE) {
        newRange.setStart(target, target.textContent?.length ?? 0);
      } else {
        newRange.setStartAfter(target);
      }
    } else if (lastInserted) {
      // Default: place the caret right after the inserted content
      newRange.setStartAfter(lastInserted);
    } else {
      // Nothing inserted; keep the caret where the removed text started
      newRange.setStart(node, start);
    }
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Add to history
    autocompleteHistory.value.push(result);

    // Trigger input event so the host editor syncs (guarded so it cannot
    // synchronously re-enter handleInput)
    isApplying = true;
    try {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    } finally {
      isApplying = false;
    }
  };

  /**
   * Handle input and check for autocomplete opportunities
   */
  const handleInput = () => {
    if (!editorRef.value) return;
    ensureCompositionListeners();
    if (isApplying) return;
    if (isComposing) {
      // Defer: run one detection pass when the composition commits instead
      // of mutating the DOM under a live IME buffer.
      pendingCompositionInput = true;
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent || "";
    const cursorPos = range.startOffset;

    // Get text before cursor (for detection)
    const textBeforeCursor = text.substring(0, cursorPos);

    // Detect autocomplete
    const result = detectAutocomplete(textBeforeCursor);

    if (result) {
      applyAutocomplete(result);
    }

    lastInput.value = text;
  };

  /**
   * Get autocomplete suggestions for current context
   */
  const getSuggestions = (
    text: string
  ): Array<{ label: string; value: string; type: AutocompleteType }> => {
    const suggestions: Array<{
      label: string;
      value: string;
      type: AutocompleteType;
    }> = [];

    // Emoji suggestions
    if (enableEmoji && text.includes(":")) {
      const lastColon = text.lastIndexOf(":");
      const query = text.substring(lastColon + 1).toLowerCase();

      if (query.length > 0) {
        Object.entries(emojiMap).forEach(([key, emoji]) => {
          const shortcut = key.slice(1, -1); // Remove colons
          if (shortcut.includes(query)) {
            suggestions.push({
              label: `${emoji} ${shortcut}`,
              value: emoji,
              type: "emoji",
            });
          }
        });
      }
    }

    // Markdown suggestions
    if (enableMarkdownShortcuts && text.startsWith("#")) {
      markdownShortcuts
        .filter((s) => s.trigger.startsWith("#"))
        .forEach((s) => {
          suggestions.push({
            label: s.description,
            value: s.trigger,
            type: "markdown",
          });
        });
    }

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  };

  /**
   * Get available shortcuts list (for help/documentation)
   */
  const getShortcutsList = () => {
    return {
      markdown: markdownShortcuts.map((s) => ({
        trigger: s.trigger,
        description: s.description,
      })),
      emoji: Object.entries(emojiMap).map(([key, emoji]) => ({
        trigger: key,
        emoji,
      })),
      punctuation: Object.entries(punctuationMap).map(([pattern, result]) => ({
        pattern,
        result,
      })),
    };
  };

  /**
   * Undo last autocomplete
   */
  const undoLastAutocomplete = () => {
    if (autocompleteHistory.value.length === 0) return null;
    return autocompleteHistory.value.pop();
  };

  return {
    // Detection
    detectAutocomplete,
    detectUrl,
    detectEmail,
    detectMarkdown,
    detectEmoji,
    detectSmartPunctuation,
    convertSmartQuotes,

    // Application
    applyAutocomplete,
    handleInput,

    // Suggestions
    getSuggestions,
    getShortcutsList,

    // History
    autocompleteHistory: autocompleteHistory,
    undoLastAutocomplete,

    // Configuration
    markdownShortcuts,
    emojiMap,
    punctuationMap,
  };
}
