import { ref } from "vue";

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
   * Detect and convert URLs to links
   */
  const detectUrl = (text: string): AutocompleteResult | null => {
    if (!enableUrlLinking) return null;

    const match = text.match(urlPattern);
    if (!match) return null;

    const url = match[0];
    let href = url;

    // Add protocol if missing
    if (!url.startsWith("http")) {
      href = "https://" + url;
    }

    return {
      type: "url",
      original: url,
      replacement: `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`,
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
   * Detect and convert emails to mailto links
   */
  const detectEmail = (text: string): AutocompleteResult | null => {
    if (!enableEmailLinking) return null;

    const match = text.match(emailPattern);
    if (!match) return null;

    const email = match[0];

    return {
      type: "email",
      original: email,
      replacement: `<a href="mailto:${email}">${email}</a>`,
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

      // Opening double quote (after space or start)
      converted = converted.replaceAll(/(^|\s)"/g, '$1"');

      // Closing double quote (before space, punctuation, or end)
      converted = converted.replaceAll(/"($|\s|[.,!?;:])/g, '"$1');

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
      converted = converted.replaceAll(/(^|\s)'/g, "$1\u2018");

      // Closing single quote / apostrophe - using hex escape
      converted = converted.replaceAll(/'($|\s|[.,!?;:])/g, "\u2019$1");

      // Apostrophe in contractions (don't, it's, etc.) - using hex escape
      converted = converted.replaceAll(/(\w)'(\w)/g, "$1\u2019$2");

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
      const match = new RegExp(shortcut.pattern).exec(text);
      if (match) {
        const replacement = shortcut.replacement(match);
        return {
          type: "markdown",
          original: text,
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
   * Apply autocomplete to current selection/cursor
   */
  const applyAutocomplete = (result: AutocompleteResult) => {
    if (!editorRef.value) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Create replacement node
    const template = document.createElement("template");
    template.innerHTML = result.replacement;
    const replacement = template.content;

    // Replace content
    range.deleteContents();
    range.insertNode(replacement);

    // Set cursor position
    if (result.cursorOffset === undefined) {
      // Move cursor to end of replacement
      range.collapse(false);
    } else {
      const newRange = document.createRange();
      const lastNode = replacement.lastChild || replacement;
      newRange.setStart(lastNode, result.cursorOffset);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // Add to history
    autocompleteHistory.value.push(result);

    // Trigger input event
    editorRef.value.dispatchEvent(new Event("input", { bubbles: true }));
  };

  /**
   * Handle input and check for autocomplete opportunities
   */
  const handleInput = () => {
    if (!editorRef.value) return;

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
