import { getCurrentScope, onScopeDispose, type Ref } from "vue";
import { smoothScrollIntoView } from "../utils/scroll";
import { createFindHighlights } from '../utils/findHighlights';

/**
 * Unicode-aware word character test for whole-word boundaries. ASCII `\b`
 * treats every accented letter as a NON-word character, which broke whole-word
 * for Portuguese and any accented language: "olá" could never whole-word match
 * (no boundary after á), while "ma" falsely matched inside "maçã" (a→ç read as
 * a boundary). Constructed at runtime with a try/catch so engines without
 * Unicode property escapes just keep the old ASCII behaviour instead of
 * throwing at parse time (the build targets es2015). #15
 */
const WORD_CHAR: RegExp = (() => {
  try {
    return new RegExp("[\\p{L}\\p{N}_]", "u");
  } catch {
    return /[A-Za-z0-9_]/;
  }
})();

const isWordChar = (ch: string | undefined): boolean =>
  ch !== undefined && WORD_CHAR.test(ch);

/** Escape regex metacharacters so findText always matches literally. */
const escapeRegExp = (findText: string): string =>
  findText.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Whole-word check for a match at [index, index+length) in the flattened
 * text. A boundary is required only on the sides whose needle edge char IS a
 * word character (VS Code semantics) — so "@handle" matches after a space,
 * which ASCII \b's asymmetry forbade, and accented words work (#15).
 */
/** The full code point ENDING at `index` (handles surrogate pairs). #r15-30 */
const charBeforeAt = (text: string, index: number): string | undefined => {
  if (index <= 0) return undefined;
  const lo = text.charCodeAt(index - 1);
  if (lo >= 0xdc00 && lo <= 0xdfff && index >= 2) {
    const hi = text.charCodeAt(index - 2);
    if (hi >= 0xd800 && hi <= 0xdbff) return text.slice(index - 2, index);
  }
  return text[index - 1];
};

/** The full code point STARTING at `index` (handles surrogate pairs). */
const charAfterAt = (text: string, index: number): string | undefined => {
  const cp = text.codePointAt(index);
  return cp === undefined ? undefined : String.fromCodePoint(cp);
};

const isWholeWordAt = (
  text: string,
  index: number,
  length: number,
  findText: string
): boolean => {
  // Neighbours are read as CODE POINTS: indexing single code units saw half a
  // surrogate pair (an astral letter like 𝐀), mis-judging the boundary. #r15-30
  const startOk =
    !isWordChar(findText[0]) || !isWordChar(charBeforeAt(text, index));
  const endOk =
    !isWordChar(findText[findText.length - 1]) ||
    !isWordChar(charAfterAt(text, index + length));
  return startOk && endOk;
};

/**
 * Subtrees find/replace must NOT touch: a variable pill's label is derived
 * from data-variable and the sanitizer reverts any edit to it (leaving the
 * DOM/model/history desynced), and contenteditable=false embeds aren't prose.
 */
const isSkippedContainer = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE &&
  ((node as HTMLElement).classList.contains("editor-variable") ||
    (node as HTMLElement).getAttribute("contenteditable") === "false" ||
    (node as HTMLElement).classList.contains("embedded-resizable-container"));

/**
 * Block-level tags whose boundaries a match must never span — they mirror the
 * visual paragraph/line structure and contribute a "\n" separator to the text
 * map below (matching a term across two paragraphs would be nonsense).
 */
const BLOCK_TAGS = new Set([
  "p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
  "td", "th", "pre", "ul", "ol", "table", "thead", "tbody", "tfoot", "tr",
  "nav", "section", "article",
]);

interface TextSegment {
  node: Text;
  /** Global offset of this node's first character in the flattened text. */
  start: number;
}

/**
 * Flatten the container's PROSE into one searchable string plus anchors
 * mapping every character back to its (text node, offset). Inline elements
 * contribute contiguous text — so a match can span he<b>llo</b>, a comment
 * highlight, or any inline split (#14) — while block boundaries (on BOTH
 * sides, so bare root text can't join a following block — #r15-18), <br>,
 * <hr>, images/bare embeds (#r16-7), and skipped containers (pills/embeds)
 * contribute a "\n" separator so a match can never span across them.
 */
const buildTextMap = (
  root: Node
): { text: string; segments: TextSegment[] } => {
  let text = "";
  const segments: TextSegment[] = [];
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const data = node.textContent ?? "";
      if (data) {
        segments.push({ node: node as Text, start: text.length });
        text += data;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (isSkippedContainer(node)) {
      text += "\n";
      return;
    }
    const tag = (node as HTMLElement).tagName.toLowerCase();
    // Images and bare embeds are separators too: a match that spanned an
    // <img> would let Replace silently swallow the image with the matched
    // text. (Embeds in resizable containers are already skipped above.) #r16-7
    if (
      tag === "br" ||
      tag === "hr" ||
      tag === "img" ||
      tag === "video" ||
      tag === "iframe"
    ) {
      text += "\n";
      return;
    }
    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) text += "\n";
    for (const child of Array.from(node.childNodes)) walk(child);
    if (isBlock) text += "\n";
  };
  walk(root);
  return { text, segments };
};

/** Every match of findText inside `container`, as (possibly cross-node) Ranges. */
const collectRangesIn = (
  container: Node,
  findText: string,
  opts: { caseSensitive: boolean; wholeWord: boolean }
): Range[] => {
  const regex = new RegExp(
    escapeRegExp(findText),
    opts.caseSensitive ? "g" : "gi"
  );
  const { text, segments } = buildTextMap(container);
  const ranges: Range[] = [];

  // Map a global offset to (text node, offset). Matches arrive in ascending
  // order, so a single monotonic segment pointer replaces the old linear scan
  // per endpoint — Find is O(text + matches), not O(matches × segments).
  // A match END on a node boundary resolves into the EARLIER node; a START
  // there resolves into the LATER one. #r15-16
  let segIdx = 0;
  const locateAt = (
    offset: number,
    isEnd: boolean
  ): { node: Text; offset: number } | null => {
    while (segIdx < segments.length) {
      const seg = segments[segIdx];
      const len = seg.node.textContent?.length ?? 0;
      if (seg.start + len < offset) {
        segIdx++;
        continue;
      }
      if (!isEnd && offset === seg.start + len) {
        segIdx++; // a START at the junction belongs to the NEXT node
        continue;
      }
      const ok = isEnd
        ? offset > seg.start && offset <= seg.start + len
        : offset >= seg.start && offset < seg.start + len;
      return ok ? { node: seg.node, offset: offset - seg.start } : null;
    }
    return null;
  };

  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[0].length === 0) {
      regex.lastIndex++; // guard empty-match loop
      continue;
    }
    if (opts.wholeWord && !isWholeWordAt(text, m.index, m[0].length, findText)) {
      continue;
    }
    const start = locateAt(m.index, false);
    const end = locateAt(m.index + m[0].length, true);
    if (start && end) {
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      ranges.push(range);
    }
  }
  return ranges;
};

/**
 * Count findText's matches in an HTML string with the SAME engine Find,
 * Replace and Replace All use (cross-node text map, Unicode whole-word,
 * skipped pills/embeds). The Find modal's counter must use this — its old
 * private per-text-node + ASCII-\b counter reported "No matches" for
 * boundary-spanning terms and disabled the Replace buttons. #r15-7
 */
export function countMatchesInHtml(
  html: string,
  findText: string,
  opts: { caseSensitive: boolean; wholeWord: boolean }
): number {
  if (!findText) return 0;
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return collectRangesIn(temp, findText, opts).length;
}

interface FindReplaceOptions {
  editorContent: Ref<HTMLElement | null>;
  captureSnapshot: () => void;
  /**
   * Called after Replace All rewrites innerHTML. Setting innerHTML destroys and
   * recreates every child node, dropping the click listeners on comment
   * highlights and the handlers on embedded media — this hook re-binds them
   * (restoreThreads + embed re-init), mirroring the undo/redo content-replace
   * path. Optional so unit tests need not wire it.
   */
  onContentReplaced?: () => void;
}

export interface FindRequest {
  findText: string;
  direction: "next" | "previous" | "current";
  options?: { caseSensitive: boolean; wholeWord: boolean };
  /** Inline search supplies context and reveals the exact range itself. */
  preview?: boolean;
  /** Recount while writing without changing the writer's selection. */
  selectMatch?: boolean;
}

export interface FindResult {
  current: number;
  total: number;
  range?: Range;
  passage?: { before: string; match: string; after: string; heading: string };
}

export interface ReplaceRequest {
  findText: string;
  replaceText: string;
  options: { caseSensitive: boolean; wholeWord: boolean };
}

function describeMatch(range: Range, root: HTMLElement): NonNullable<FindResult['passage']> {
  const element = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer as HTMLElement : range.startContainer.parentElement;
  const block = element?.closest('p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,pre,div') ?? root;
  const before = range.cloneRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);
  const after = range.cloneRange();
  after.selectNodeContents(block);
  after.setStart(range.endContainer, range.endOffset);
  const lead = before.toString();
  const tail = after.toString();
  const headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'));
  const preceding = headings.filter(candidate => candidate === element || candidate.contains(range.startContainer) ||
    Boolean(candidate.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING));
  const heading = preceding[preceding.length - 1];
  return {
    before: lead.length > 56 ? `…${lead.slice(-56).replace(/^\S*\s/, '')}` : lead,
    match: range.toString(),
    after: tail.length > 56 ? `${tail.slice(0, 56).replace(/\s\S*$/, '')}…` : tail,
    heading: heading?.textContent?.trim() ?? 'Matching passage',
  };
}

/**
 * Composable for handling find and replace functionality
 * Provides search and replace operations within the editor
 */
export function useFindReplace(options: FindReplaceOptions) {
  const { editorContent, captureSnapshot, onContentReplaced } = options;
  const previewHighlights = createFindHighlights();

  const BLOCK_SELECTOR =
    "p, div, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, pre";

  /**
   * Remove inline formatting elements a cross-node replacement hollowed out
   * (deleting `llo` out of he<b>llo</b> leaves <b></b>). Spans are left alone —
   * pills/highlights carry meaning in their attributes and the sanitizer
   * already drops truly empty ones.
   */
  const pruneEmptyInline = (scope: ParentNode) => {
    let changed = true;
    while (changed) {
      changed = false;
      scope.querySelectorAll("b, strong, i, em, u, s, a").forEach((el) => {
        if ((el.textContent ?? "") === "" && !el.querySelector("img, br")) {
          el.remove();
          changed = true;
        }
      });
    }
  };

  /**
   * Replace one match range with plain text. Works across nodes: extract the
   * matched content, insert a fresh TEXT node at the start point (inert — the
   * replacement is never parsed as HTML, so `<`/`&`/`$&` are literal), then
   * prune the inline tags the deletion hollowed out. Returns the inserted node.
   */
  const replaceRangeWithText = (range: Range, replaceText: string): Text => {
    const common = range.commonAncestorContainer;
    const commonEl =
      common.nodeType === Node.ELEMENT_NODE
        ? (common as HTMLElement)
        : common.parentElement;
    const scope = commonEl?.closest(BLOCK_SELECTOR) ?? commonEl;
    range.deleteContents();
    const textNode = document.createTextNode(replaceText);
    range.insertNode(textNode);
    if (scope) pruneEmptyInline(scope);
    return textNode;
  };

  /**
   * Search and replace text in HTML content.
   *
   * The match runs over the flattened prose (via buildTextMap), never the raw
   * HTML string: a naive `html.replace(regex, …)` matches inside tag names,
   * attributes and URLs, and any replacement containing `<`/`&` injects live
   * markup. Matches may span inline elements (#14); replacements are inserted
   * as text nodes, so the result is inert.
   *
   * @param replaceAll - when false, only the first match in the whole document
   *   is replaced (single "Replace"); when true, every match ("Replace All").
   */
  const searchAndReplace = (
    html: string,
    findText: string,
    replaceText: string,
    options: { caseSensitive: boolean; wholeWord: boolean },
    replaceAll = true
  ): string => {
    if (!findText) return html;

    const temp = document.createElement("div");
    temp.innerHTML = html;

    const matches = collectRangesIn(temp, findText, options);
    const targets = replaceAll ? matches : matches.slice(0, 1);
    // Back-to-front so earlier ranges' anchors stay valid while later content
    // is mutated (a replacement can remove whole text nodes).
    for (let i = targets.length - 1; i >= 0; i--) {
      replaceRangeWithText(targets[i], replaceText);
    }
    return temp.innerHTML;
  };

  // The temporary find-flash is a CLASS, not an inline background: the sanitizer
  // strips non-allowlisted classes on every emit, so even if an autosave fires
  // during the 1s flash it can never bake the highlight into the saved model
  // (an inline background survives sanitization and did exactly that). #16
  const FIND_FLASH_CLASS = "nle-find-flash";
  let pendingHighlight: {
    el: HTMLElement;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  // Remove the flash class AND the now-empty class attribute it leaves behind
  // (classList.remove of the last class leaves class="" — visible in innerHTML
  // and, though the sanitizer would drop it, best not left on the live node).
  const removeFlash = (el: HTMLElement) => {
    el.classList.remove(FIND_FLASH_CLASS);
    if (el.getAttribute("class") === "") el.removeAttribute("class");
  };

  const clearPendingHighlight = () => {
    previewHighlights.clear();
    if (pendingHighlight) {
      clearTimeout(pendingHighlight.timer);
      removeFlash(pendingHighlight.el);
      pendingHighlight = null;
    }
  };
  if (getCurrentScope()) onScopeDispose(clearPendingHighlight);

  // Navigation cursor for the current (text, options) query. Resets whenever
  // the query or options change so the first Next lands on match #1.
  let findCursor: {
    text: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    index: number;
  } | null = null;

  /**
   * Collect the DOM range of every match INSIDE the editor, over the same
   * flattened text map searchAndReplace uses — so the count, the navigation and
   * Replace all agree (a match is navigable iff it's replaceable), and matches
   * in the surrounding page chrome are never touched.
   */
  const collectMatchRanges = (
    findText: string,
    opts: { caseSensitive: boolean; wholeWord: boolean }
  ): Range[] => {
    const root = editorContent.value;
    if (!root || !findText) return [];
    return collectRangesIn(root, findText, opts);
  };

  /**
   * Find text in the editor — scoped to the editor content (never the page
   * chrome), honoring the case-sensitive / whole-word options with wrap-around.
   * Returns the 1-based current match and the total so the caller can show an
   * accurate "X of N". Replaces window.find, which searched the whole document
   * and ignored every option.
   */
  const handleFind = (data: FindRequest): FindResult => {
    if (!editorContent.value) return { current: 0, total: 0 };

    const opts = data.options ?? { caseSensitive: false, wholeWord: false };
    const ranges = collectMatchRanges(data.findText, opts);
    if (ranges.length === 0) {
      findCursor = null;
      clearPendingHighlight();
      return { current: 0, total: 0 };
    }

    const sameQuery =
      findCursor !== null &&
      findCursor.text === data.findText &&
      findCursor.caseSensitive === opts.caseSensitive &&
      findCursor.wholeWord === opts.wholeWord;

    let index: number;
    if (!sameQuery) {
      // First navigation of a new query: Next → first match, Previous → last.
      index = data.direction === "previous" ? ranges.length - 1 : 0;
    } else {
      const step = data.direction === "current" ? 0 : data.direction === "previous" ? -1 : 1;
      index = data.direction === 'current'
        ? Math.min(Math.max(findCursor!.index, 0), ranges.length - 1)
        : (findCursor!.index + step + ranges.length) % ranges.length;
    }
    findCursor = {
      text: data.findText,
      caseSensitive: opts.caseSensitive,
      wholeWord: opts.wholeWord,
      index,
    };

    const range = ranges[index];
    if (data.preview) {
      clearPendingHighlight();
      previewHighlights.update(editorContent.value, ranges, index);
    }
    const selection =
      typeof window !== "undefined" ? window.getSelection() : null;
    // Inline search paints ranges with CSS highlights and returns a bookmark
    // for Close/Escape. Borrowing the document selection here also focuses the
    // manuscript in WebKit, opening its mobile dock after reveal was measured.
    if (!data.preview && data.selectMatch !== false && selection && typeof selection.removeAllRanges === "function") {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const element =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as HTMLElement)
        : range.startContainer.parentElement;
    // Never flash the EDITOR ROOT itself: a bare-root match (text with no
    // block wrapper) resolves its parentElement to the editor, and flashing
    // that highlights the entire document. Scroll still works. #r15-19
    if (!data.preview && data.selectMatch !== false && element && element !== editorContent.value) {
      smoothScrollIntoView(element, {
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      // Restore any previous highlight before capturing this element's true
      // background, so a still-pending highlight can't leak into saved content.
      clearPendingHighlight();
      const highlightEl = element;
      highlightEl.classList.add(FIND_FLASH_CLASS);
      const timer = setTimeout(() => {
        removeFlash(highlightEl);
        pendingHighlight = null;
      }, 1000);
      pendingHighlight = { el: highlightEl, timer };
    }

    return { current: index + 1, total: ranges.length,
      ...(data.preview ? { range, passage: describeMatch(range, editorContent.value) } : {}) };
  };

  /**
   * Replace the match the user is currently sitting on (single "Replace").
   *
   * The old implementation replaced the FIRST match in the document regardless
   * of where Find had navigated: after clicking Find Next to "3 of 5" and then
   * Replace, match #1 was silently changed while the viewport still showed #3.
   * We now replace the match at the navigation cursor (falling back to the first
   * match when there's no active cursor for this exact query), matching every
   * mainstream editor.
   */
  const handleReplace = (data: {
    findText: string;
    replaceText: string;
    options: { caseSensitive: boolean; wholeWord: boolean };
  }) => {
    if (!editorContent.value) return;

    // A still-pending find highlight is inline style on a live element; it must
    // be unwound BEFORE we touch the DOM, or the temporary yellow gets baked
    // into the replaced content (and its restore timer would fire against a
    // detached node, a no-op).
    clearPendingHighlight();

    const ranges = collectMatchRanges(data.findText, data.options);
    if (ranges.length > 0) {
      const sameQuery =
        findCursor !== null &&
        findCursor.text === data.findText &&
        findCursor.caseSensitive === data.options.caseSensitive &&
        findCursor.wholeWord === data.options.wholeWord;
      // Clamp BOTH ends: the batch-53 resume parks the cursor at -1 to encode
      // "wrap to first", and a second consecutive Replace read ranges[-1] and
      // crashed. #r15-17
      const idx = sameQuery
        ? Math.min(Math.max(findCursor!.index, 0), ranges.length - 1)
        : 0;

      // Replace exactly this occurrence — possibly spanning inline elements
      // (#14) — as an inert text node, never parsed as HTML.
      const inserted = replaceRangeWithText(ranges[idx], data.replaceText);

      // A stale cursor for a DIFFERENT query must never be re-anchored with
      // THIS query's matches — drop it so the next Find starts fresh. #r15-31
      if (!sameQuery) findCursor = null;

      // Re-anchor the cursor to just BEFORE the first match at/after the end of
      // the replacement, so the modal's follow-up Find Next lands there — never
      // inside the replacement itself (which would re-target and grow the text
      // when the replacement contains the search term, e.g. "a" → "aa"). #7
      if (findCursor) {
        const fresh = collectMatchRanges(data.findText, data.options);
        let nextIdx = 0;
        // An empty replacement can leave `inserted` detached (its hollowed-out
        // parent was pruned); resume from the first match then.
        if (inserted.parentNode) {
          const resume = document.createRange();
          resume.setStartAfter(inserted);
          resume.collapse(true);
          const found = fresh.findIndex(
            (r) => r.compareBoundaryPoints(Range.START_TO_START, resume) >= 0
          );
          nextIdx = found === -1 ? fresh.length : found; // none after → wrap
        }
        findCursor.index = nextIdx - 1;
      }
    }

    captureSnapshot();
  };

  /**
   * Replace all occurrences of text in the editor ("Replace All").
   * @param data - Replace all operation data
   */
  const handleReplaceAll = (data: {
    findText: string;
    replaceText: string;
    options: { caseSensitive: boolean; wholeWord: boolean };
  }) => {
    if (!editorContent.value) return;

    // Same as handleReplace: unwind any pending find highlight before the
    // innerHTML round-trip so it can't be baked into the replaced content.
    clearPendingHighlight();

    const html = editorContent.value.innerHTML;
    const newHtml = searchAndReplace(
      html,
      data.findText,
      data.replaceText,
      data.options,
      true
    );
    editorContent.value.innerHTML = newHtml;
    // Re-bind comment highlights + embedded media whose listeners the innerHTML
    // rewrite just dropped, BEFORE snapshotting the rebound DOM. r14b-1
    onContentReplaced?.();
    captureSnapshot();
  };

  return {
    handleFind,
    handleReplace,
    handleReplaceAll,
    searchAndReplace,
    clearPendingHighlight,
  };
}
