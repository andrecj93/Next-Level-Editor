/**
 * Command definitions for slash commands and toolbar actions
 */

import { splitBlockAtCaret, placeCaretInside } from "./blockInsertion";
import { applyChecklistItemA11y } from "./checklist";
import { countWords, countCharacters } from "./wordSegmentation";
import {
  getBlockSlicesInRange,
  snapshotEmptyInlineHusks,
  removeNewEmptyInlineHusks,
  isolateFormattingBoundary,
} from "./formatting";
import {
  clampRangeToElement,
  rangeCapturesContent,
  rangeTouchesElement,
  rangeForEditableFormatting,
} from "./rangeContact";
import { buildTableGrid } from "./tableGrid";
import { createTypingPlaceholder } from './typingPlaceholder';
import { captureSelectionBookmark } from './selectionBookmark';
import { getCaretOffsets, setCaretOffsets } from './caretOffset';

/**
 * Wrap a non-collapsed range's content in styled `<span>`s WITHOUT ever nesting
 * a block inside an inline element. A cross-paragraph selection wrapped in one
 * span produces `<span><p>…</p><p>…</p></span>` — invalid block-in-inline that
 * collapses paragraphs onto one line on export and is fragile across round-trips
 * (the same trap applyInlineStyle avoids). When the selection spans multiple
 * blocks we wrap each block's slice in its own span instead.
 *
 * `applyStyle` stamps the inline styles onto each span; `prepareContents`, when
 * given, post-processes each extracted fragment (e.g. strip nested sized spans
 * so font sizes don't compound). Returns the spans in document order.
 */
function wrapRangeSlicesPerBlock(
  range: Range,
  root: HTMLElement,
  applyStyle: (span: HTMLSpanElement) => void,
  prepareContents?: (fragment: DocumentFragment) => void
): HTMLElement[] {
  const wrapSlice = (sliceRange: Range): HTMLElement | null => {
    if (sliceRange.collapsed) return null;
    const span = document.createElement("span");
    applyStyle(span);
    const contents = sliceRange.extractContents();
    prepareContents?.(contents);
    span.appendChild(contents);
    sliceRange.insertNode(span);
    return span;
  };

  // Per-block slices (leaf blocks + dropped ancestors' direct inline runs,
  // each clamped to the range): disjoint subtrees' sub-ranges built up front
  // stay valid as earlier slices are wrapped, and a parent block's own text
  // is never skipped. Zero slices: pure boundary-touch → nothing to wrap;
  // BARE inline content under the root (no block wrapper) → wrap the raw
  // range, since with no blocks there is no boundary to rip across.
  // #r15-4 #r16-4 #r17-1
  const slices = getBlockSlicesInRange(range, root);
  const targets =
    slices.length > 0 ? slices : rangeCapturesContent(range) ? [range] : [];

  // Mutate BACK TO FRONT: slices can share a container (a parent's inline
  // runs around a sublist), and an earlier extraction would shift the offsets
  // later slices were built on. Returned spans are re-flipped to doc order.
  const huskBaseline = snapshotEmptyInlineHusks(root);
  const spans: HTMLElement[] = [];
  [...targets].reverse().forEach((sub) => {
    const span = wrapSlice(sub);
    if (span) spans.push(span);
  });
  // A slice boundary at (textNode, 0) inside an <em>/<a> makes extractContents
  // clone it and leave the emptied original behind — drop that litter. #r18
  removeNewEmptyInlineHusks(root, huskBaseline);
  return spans.reverse();
}

/**
 * Strip content per block: extract each block's slice, run `prepareContents`
 * (e.g. remove nested sized spans), and re-insert the bare contents WITHOUT a
 * wrapper. Mirrors wrapRangeSlicesPerBlock's slicing so a CLEAR never runs
 * extractContents across a block boundary — the raw-range clear cloned the
 * partially-contained <p>s and left ghost empty blocks (with orphaned emptied
 * spans) bracketing the content. Returns the re-inserted nodes in doc order.
 * #r19-1
 */
function clearRangeSlicesPerBlock(
  range: Range,
  root: HTMLElement,
  prepareContents: (fragment: DocumentFragment) => void
): Node[] {
  const slices = getBlockSlicesInRange(range, root);
  const targets =
    slices.length > 0 ? slices : rangeCapturesContent(range) ? [range] : [];

  // Back to front (slices can share a container). Each group's nodes are
  // collected, then flipped to document order.
  const huskBaseline = snapshotEmptyInlineHusks(root);
  const groups: Node[][] = [];
  [...targets].reverse().forEach((slice) => {
    if (slice.collapsed) return;
    const contents = slice.extractContents();
    prepareContents(contents);
    const nodes = Array.from(contents.childNodes);
    slice.insertNode(contents);
    if (nodes.length > 0) groups.push(nodes);
  });
  removeNewEmptyInlineHusks(root, huskBaseline);
  return groups.reverse().flat();
}

/**
 * Re-select the range that spans a freshly-created list of wrapper spans and
 * hand it back to the live selection, so the just-styled text stays highlighted.
 */
function reselectWrappers(
  selection: Selection,
  spans: HTMLElement[]
): void {
  if (spans.length === 0) return;
  const newRange = document.createRange();
  newRange.setStartBefore(spans[0]);
  newRange.setEndAfter(spans[spans.length - 1]);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

export interface EditorCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon?: string;
  execute: () => void;
}

/**
 * Extract plain text from an HTML string.
 *
 * Uses the DOM when it's available (accurate `innerText`), and falls back to a
 * document-free strip on the server. The counts below feed computeds a template
 * reads during render, so a bare `document.createElement` here crashed SSR with
 * `document is not defined`; the client re-computes the exact value on hydration.
 */
function htmlToPlainText(html: string, source?: Element): string {
  if (typeof document !== "undefined") {
    const temp = source ?? document.createElement("div");
    if (!source) temp.innerHTML = html;
    // Preserve block boundaries without creating thousands of temporary text
    // nodes on every keystroke in a manuscript. Inline marks stay within words.
    const blocks = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'TR', 'TD', 'TH', 'BLOCKQUOTE', 'PRE', 'BR', 'FIGURE', 'HR']);
    const parts: string[] = [];
    const read = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) { parts.push(node.textContent || ''); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      const tag = element.localName.toUpperCase();
      if (tag === 'SCRIPT' || tag === 'STYLE'
        || element.classList.contains('table-of-contents') || element.classList.contains('page-break')) return;
      const boundary = blocks.has(tag);
      if (boundary) parts.push(' ');
      for (let child = node.firstChild; child; child = child.nextSibling) read(child);
      if (boundary) parts.push(' ');
    };
    read(temp);
    // Empty inline styles use a zero-width caret marker. It is not prose;
    // retaining it after Cut made an empty style count as another word.
    return parts.join('').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  }
  // SSR fallback: turn block-closing tags and <br> into spaces so words across
  // block boundaries don't fuse, strip the rest, then decode the few entities a
  // plain-text count cares about.
  return html
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|pre)\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u200b/g, "")
    // Collapse + trim to mirror the DOM's innerText normalization, so the count
    // matches the client value that replaces it on hydration.
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get word count from HTML content
 * @param html - HTML content
 * @returns Word count
 */
export function getWordCount(html: string): number {
  return getTextStatistics(html).wordCount;
}

/** Shared counts avoid parsing the same manuscript twice during a render. */
export function getTextStatistics(html: string, source?: Element): { wordCount: number; characterCount: number } {
  const text = htmlToPlainText(html, source);
  return { wordCount: countWords(text), characterCount: countCharacters(text) };
}

/**
 * Get character count from HTML content (including spaces)
 * @param html - HTML content
 * @returns Character count with spaces
 */
export function getCharacterCount(html: string): number {
  return countCharacters(htmlToPlainText(html));
}

/**
 * Get character count excluding spaces
 * @param html - HTML content
 * @returns Character count without spaces
 */
export function getCharacterCountWithoutSpaces(html: string): number {
  return countCharacters(htmlToPlainText(html).replace(/\s/g, ""));
}

/** Imported inline marks may carry the size directly, without a span. */
const FONT_SIZE_INLINE_TAGS = new Set(['SPAN', 'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUB', 'SUP', 'CODE', 'MARK', 'SMALL', 'BIG']);
function hasInlineFontSize(node: Node): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    FONT_SIZE_INLINE_TAGS.has(node.tagName) &&
    node.style.fontSize !== ""
  );
}

/**
 * Remove an inline mark's font size and drop its empty style attribute.
 * Unwrap empty spans while preserving semantic marks and their attributes.
 */
function clearInlineFontSize(span: HTMLElement): void {
  span.style.fontSize = "";
  if (!span.getAttribute("style")) {
    span.removeAttribute("style");
  }
  if (span.tagName === 'SPAN' && span.attributes.length === 0 && span.parentNode) {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    span.remove();
  }
}

/** Strip sizing from editable inline marks inside a fragment or element. */
function removeInlineFontSizesWithin(
  container: DocumentFragment | HTMLElement
): void {
  container.querySelectorAll<HTMLElement>('[style]').forEach((span) => {
    if (hasInlineFontSize(span) && !span.closest('[contenteditable="false"]')) {
      clearInlineFontSize(span);
    }
  });
}

/**
 * Apply font size to selected text or block.
 *
 * Re-sizing first isolates the intended run and removes its inherited size,
 * avoiding nested spans and multiplicative em compounding. "normal" clears
 * sizing from selected text or future typing without inserting a 1em wrapper.
 *
 * @param root - Editor root element (bounds the sized-ancestor search)
 * @param size - Font size (small, normal, large, huge)
 */
export function applyFontSize(
  root: HTMLElement,
  size: "small" | "normal" | "large" | "huge"
) {
  const sizeMap = {
    small: "0.875em",
    normal: "1em",
    large: "1.25em",
    huge: "1.75em",
  };

  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const originalRange = selection.getRangeAt(0);
  if (!root.contains(originalRange.startContainer) || !root.contains(originalRange.endContainer)) return;
  const range = rangeForEditableFormatting(originalRange, root);
  if (!range) return;
  const collapsed = range.collapsed;
  const backwards = selection.anchorNode === originalRange.endContainer && selection.anchorOffset === originalRange.endOffset;

  // "normal" clears sizing; it never wraps a 1em span.
  const targetSize = size === "normal" ? null : sizeMap[size];

  const doc = root.ownerDocument;
  const emptyBefore = snapshotEmptyInlineHusks(root);
  let placeholder: HTMLElement | null = null;
  if (collapsed) {
    let ancestor = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer as HTMLElement : range.startContainer.parentElement;
    let hasSize = false;
    while (ancestor && ancestor !== root) {
      if (hasInlineFontSize(ancestor)) hasSize = true;
      ancestor = ancestor.parentElement;
    }
    if (!targetSize && !hasSize) return;
    const point = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as Element : range.startContainer.parentElement;
    const pending = point?.closest<HTMLElement>('[data-nle-typing-placeholder="true"]');
    placeholder = pending?.textContent === '\u200b' ? pending : createTypingPlaceholder(doc);
    if (!placeholder.parentNode) range.insertNode(placeholder);
    range.selectNode(placeholder);
  } else if (!rangeCapturesContent(range)) return;

  // Isolate the selected run from inherited sizes before clearing/applying.
  // This also lets a collapsed caret leave a sized span without changing the
  // letters on either side, or multiplying em units on repeated choices.
  const start = doc.createComment('size-start');
  const end = doc.createComment('size-end');
  const endRange = range.cloneRange();
  endRange.collapse(false);
  endRange.insertNode(end);
  const startRange = range.cloneRange();
  startRange.collapse(true);
  startRange.insertNode(start);
  let bookmark: ReturnType<typeof captureSelectionBookmark> = null;
  try {
    isolateFormattingBoundary(end, root, 'end', hasInlineFontSize);
    isolateFormattingBoundary(start, root, 'start', hasInlineFontSize);
    const selected = doc.createRange();
    selected.setStartAfter(start);
    selected.setEndBefore(end);
    if (targetSize) {
      wrapRangeSlicesPerBlock(selected, root, span => { span.style.fontSize = targetSize; }, removeInlineFontSizesWithin);
    } else {
      clearRangeSlicesPerBlock(selected, root, removeInlineFontSizesWithin);
    }
    removeNewEmptyInlineHusks(root, emptyBefore);
    if (!collapsed) {
      const restored = doc.createRange();
      restored.setStartAfter(start);
      restored.setEndBefore(end);
      selection.setBaseAndExtent(
        backwards ? restored.endContainer : restored.startContainer, backwards ? restored.endOffset : restored.startOffset,
        backwards ? restored.startContainer : restored.endContainer, backwards ? restored.startOffset : restored.endOffset);
      bookmark = captureSelectionBookmark(root);
    }
  } finally {
    end.remove();
    start.remove();
    if (placeholder?.firstChild) selection.collapse(placeholder.firstChild, 1);
    else bookmark?.restore();
  }
}

/**
 * Apply text alignment to selected block
 * @param root - Editor root element
 * @param alignment - Text alignment (left, center, right, justify)
 */
export function applyTextAlignment(
  root: HTMLElement,
  alignment: "left" | "center" | "right" | "justify"
) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  let range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;

  // A browser's first typed line is often bare text (with inline marks) at
  // the editor root. Give touched inline runs their own paragraphs so block
  // alignment is saved with the document, never on the editing surface.
  const structural = 'p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre,br,hr,table,ul,ol,figure,td,th';
  const runs: Node[][] = [];
  let run: Node[] = [];
  const flush = () => { if (run.length) runs.push(run); run = []; };
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE &&
        ((child as Element).matches(structural) || (child as Element).querySelector(structural))) flush();
    else run.push(child);
  }
  flush();
  const touched = runs.filter(nodes => {
    // Whitespace between serialized blocks is not another authored paragraph.
    if (!range.collapsed && nodes.every(node => node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())) return false;
    const content = root.ownerDocument.createRange();
    content.setStartBefore(nodes[0]);
    content.setEndAfter(nodes[nodes.length - 1]);
    if (range.collapsed) return range.compareBoundaryPoints(Range.START_TO_START, content) >= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, content) <= 0;
    const slice = range.cloneRange();
    if (slice.compareBoundaryPoints(Range.START_TO_START, content) < 0) slice.setStart(content.startContainer, content.startOffset);
    if (slice.compareBoundaryPoints(Range.END_TO_END, content) > 0) slice.setEnd(content.endContainer, content.endOffset);
    return !slice.collapsed && rangeCapturesContent(slice);
  });
  if (touched.length) {
    const point = (node: Node, offset: number) => ({ node, offset,
      next: node === root ? root.childNodes[offset] : undefined,
      previous: node === root ? root.childNodes[offset - 1] : undefined });
    const anchor = point(selection.anchorNode!, selection.anchorOffset);
    const focus = point(selection.focusNode!, selection.focusOffset);
    for (const nodes of touched) {
      const paragraph = root.ownerDocument.createElement('p');
      root.insertBefore(paragraph, nodes[0]);
      nodes.forEach(node => paragraph.appendChild(node));
    }
    const restorePoint = (saved: ReturnType<typeof point>): [Node, number] => {
      if (saved.node !== root) return [saved.node, saved.offset];
      const adjacent = saved.next ?? saved.previous;
      const parent = adjacent?.parentNode;
      return parent ? [parent, Array.from(parent.childNodes).indexOf(adjacent!) + (saved.next ? 0 : 1)] : [root, 0];
    };
    selection.setBaseAndExtent(...restorePoint(anchor), ...restorePoint(focus));
    range = selection.getRangeAt(0);
  } else if (!root.childNodes.length && range.collapsed) {
    const paragraph = root.ownerDocument.createElement('p');
    paragraph.appendChild(root.ownerDocument.createElement('br'));
    root.appendChild(paragraph);
    selection.collapse(paragraph, 0);
    range = selection.getRangeAt(0);
  }

  // Get the element - if commonAncestorContainer is a text node, use its parent
  let element = range.commonAncestorContainer;
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement as HTMLElement;
  } else {
    element = element as HTMLElement;
  }

  // Helper function to check if an element is a block element that can have text alignment
  const isAlignableBlock = (el: HTMLElement | null): boolean => {
    if (!el?.tagName) return false;
    const tagName = el.tagName.toLowerCase();
    return [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "div",
      "li",
      "blockquote",
      // A cell is the alignable block for text placed straight into it — which
      // is EVERY cell the editor's own Insert > Table makes (insertTable sets
      // td.textContent). Without these, the caret's walk-up ran through tr,
      // tbody and table finding nothing alignable, and the button was a silent
      // no-op. A cell the user nested a <p> into still lets that <p> own the
      // alignment: the walk-up finds it first. #R23-14
      "td",
      "th",
    ].includes(tagName);
  };

  // If the common ancestor is the root or very close to it, apply to all block children in the selection
  if (element === root || element?.parentElement === root) {
    // Get all block elements that are at least partially within the selection
    const blockElements: HTMLElement[] = [];

    // Whether the selection genuinely touches this element — boundary-leak-safe
    // (a selection ending INSIDE the next block at (firstChild, 0) selects zero
    // of it and must not drag it in; a collapsed caret still targets its own
    // block). Shared with the list commands. [r9 boundary leak]
    const rangeTouches = (el: HTMLElement): boolean =>
      rangeTouchesElement(range, el);

    const collectBlocks = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        // Only align blocks the selection actually touches. Without this guard
        // a selection that merely spans two blocks (so commonAncestor is root)
        // aligned EVERY top-level block in the document. `intersectsNode`
        // includes a block that fully contains the (even collapsed) range.
        if (isAlignableBlock(el) && rangeTouches(el)) {
          blockElements.push(el);
        }
        // Recurse into children
        Array.from(node.childNodes).forEach(collectBlocks);
      }
    };

    // Collect all block elements within the range
    if (element === root) {
      // Select all scenario - apply to all direct block children
      Array.from(root.childNodes).forEach(collectBlocks);
    } else {
      // Apply to the element itself if it's a block
      collectBlocks(element);
    }

    // Apply alignment to all collected blocks
    blockElements.forEach((block) => {
      block.style.textAlign = alignment;
    });

    if (blockElements.length > 0) return;
  }

  // Find the closest block element (original behavior for single element selection)
  while (element && element !== root) {
    if (isAlignableBlock(element as HTMLElement)) {
      (element as HTMLElement).style.textAlign = alignment;
      return;
    }
    const parent = (element as HTMLElement).parentElement;
    if (!parent) break;
    element = parent;
  }
}

/**
 * Apply text color to selection
 * @param root - Editor root element
 * @param color - Color value (hex, rgb, etc.)
 */
export function applyTextColor(root: HTMLElement, color: string) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    // Insert a span with color at caret position
    const span = document.createElement("span");
    span.style.color = color;
    const placeholder = createTypingPlaceholder(root.ownerDocument);
    span.appendChild(placeholder);
    range.insertNode(span);
    range.setStart(placeholder.firstChild!, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Wrap per block so a multi-paragraph selection never nests <p> in a <span>.
    const spans = wrapRangeSlicesPerBlock(
      range,
      root,
      (span) => {
        span.style.color = color;
      },
      (fragment) => {
        // Clear any nested inline text color so the new color applies uniformly.
        // Otherwise an already-colored span inside the selection keeps its color
        // (it wins by nesting) and the recolor comes out mixed. #9
        fragment.querySelectorAll<HTMLElement>("*").forEach((el) => {
          if (el.style?.color) el.style.color = "";
        });
      }
    );
    reselectWrappers(selection, spans);
  }
}

/**
 * Apply background color to selection
 * @param root - Editor root element
 * @param color - Color value (hex, rgb, etc.)
 */
/** Values from the "None" swatch (and equivalents) that mean "remove the
 *  highlight" rather than paint a colour. */
const HIGHLIGHT_CLEAR_VALUES = new Set([
  "transparent",
  "none",
  "",
  "rgba(0, 0, 0, 0)",
  "rgba(0,0,0,0)",
]);

/**
 * Remove the highlight styling from the selection: clears the background (and
 * the padding / radius / auto-contrast colour that were applied WITH it) from
 * every highlight span the selection touches, unwrapping spans that end up
 * style-less. The old code instead wrapped the text in a new
 * `background:transparent; color:#fff` span — turning the text invisible and
 * leaving the original highlight in place.
 */
function removeHighlight(range: Range, root: HTMLElement) {
  if (range.collapsed) return;
  const container = range.commonAncestorContainer;
  const scope =
    container.nodeType === Node.ELEMENT_NODE
      ? (container as Element)
      : container.parentElement;
  if (!scope) return;

  const candidates = new Set<HTMLElement>();
  const addAncestors = (node: Node) => {
    let el: Element | null =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    while (el && el !== root) {
      if (
        el instanceof HTMLElement &&
        el.tagName === "SPAN" &&
        el.style.backgroundColor
      ) {
        candidates.add(el);
      }
      el = el.parentElement;
    }
  };
  addAncestors(range.startContainer);
  addAncestors(range.endContainer);
  scope.querySelectorAll<HTMLElement>("span").forEach((el) => {
    // rangeTouchesElement, not intersectsNode: intersectsNode counts a range
    // that merely TOUCHES a node, so dragging paragraph 1 up to the very start
    // of a highlight in paragraph 2 cleared that highlight — not one of its
    // characters was selected. #R23-10
    if (el.style.backgroundColor && rangeTouchesElement(range, el)) {
      candidates.add(el);
    }
  });

  const stripHighlightStyles = (el: HTMLElement) => {
    el.style.removeProperty("background-color");
    el.style.removeProperty("background");
    el.style.removeProperty("padding");
    el.style.removeProperty("border-radius");
    el.style.removeProperty("color");
    if (!el.getAttribute("style")) el.removeAttribute('style');
    if (el.attributes.length === 0) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  };

  /** Whether `range` covers every character of `el`. */
  const coversWholeElement = (el: HTMLElement): boolean => {
    const whole = document.createRange();
    whole.selectNodeContents(el);
    return (
      range.compareBoundaryPoints(Range.START_TO_START, whole) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, whole) >= 0
    );
  };

  candidates.forEach((el) => {
    if (coversWholeElement(el)) {
      stripHighlightStyles(el);
      return;
    }
    // PARTIAL selection: split the run so only the selected characters lose
    // their highlight. Stripping the whole span un-highlighted "alpha beta
    // gamma" when the user had selected just "beta". #R23-10
    const parent = el.parentNode;
    if (!parent) return;
    const inner = clampRangeToElement(range, el);
    if (!rangeCapturesContent(inner)) return;

    const selected = inner.extractContents();
    // After the extraction the range is collapsed at the split point; move
    // everything from there to the end of the span into a trailing clone.
    const tailRange = document.createRange();
    tailRange.setStart(inner.startContainer, inner.startOffset);
    tailRange.setEnd(el, el.childNodes.length);
    const tail = tailRange.extractContents();

    // The selected part keeps the span's OTHER styling (bold, font…) and only
    // loses the highlight — same treatment the whole-span path gives.
    const middle = el.cloneNode(false) as HTMLElement;
    middle.appendChild(selected);

    const trailing = el.cloneNode(false) as HTMLElement;
    trailing.appendChild(tail);

    const anchor = el.nextSibling;
    parent.insertBefore(middle, anchor);
    if (trailing.textContent) parent.insertBefore(trailing, anchor);
    stripHighlightStyles(middle);
    if (!el.textContent) el.remove();
  });
  root.normalize?.();
}

export function applyBackgroundColor(root: HTMLElement, color: string) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;

  // "None" swatch / transparent → remove the highlight instead of painting a
  // transparent span (which forced white, invisible text).
  if (
    typeof color !== "string" ||
    HIGHLIGHT_CLEAR_VALUES.has(color.trim().toLowerCase())
  ) {
    if (range.collapsed) {
      const point = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer as Element : range.startContainer.parentElement;
      let highlighted = false;
      for (let ancestor = point; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
        if (ancestor instanceof HTMLElement && ancestor.tagName === 'SPAN' && ancestor.style.backgroundColor) highlighted = true;
      }
      if (!highlighted) return;
      // Give future typing its own unhighlighted position without repainting
      // the authored letters on either side of the caret.
      const pending = point?.closest<HTMLElement>('[data-nle-typing-placeholder="true"]');
      const placeholder = pending?.textContent === '\u200b' ? pending : createTypingPlaceholder(root.ownerDocument);
      if (!placeholder.parentNode) range.insertNode(placeholder);
      range.selectNode(placeholder);
      removeHighlight(range, root);
      selection.collapse(placeholder.firstChild, 1);
      return;
    }
    // Splitting a highlighted run extracts its text, collapsing the live
    // range. Keep the same words selected so the next revision replaces them.
    const position = getCaretOffsets(root, true);
    removeHighlight(range, root);
    setCaretOffsets(root, position);
    return;
  }

  if (range.collapsed) {
    const span = document.createElement("span");
    span.style.backgroundColor = color;
    // Ensure text contrast in dark mode
    span.style.color = getContrastColor(color);
    span.style.padding = "2px 4px";
    span.style.borderRadius = "2px";
    const placeholder = createTypingPlaceholder(root.ownerDocument);
    span.appendChild(placeholder);
    range.insertNode(span);
    range.setStart(placeholder.firstChild!, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Wrap per block so a multi-paragraph highlight never nests <p> in a <span>.
    const spans = wrapRangeSlicesPerBlock(range, root, (span) => {
      span.style.backgroundColor = color;
      // Ensure text contrast in dark mode
      span.style.color = getContrastColor(color);
      span.style.padding = "2px 4px";
      span.style.borderRadius = "2px";
    });
    reselectWrappers(selection, spans);
  }
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = lig - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

/**
 * Resolve any CSS color (hex 3/6-digit, rgb(a), hsl(a), or named) to RGB.
 * Returns null when the value cannot be resolved.
 */
function parseColorToRgb(color: string): [number, number, number] | null {
  const value = color.trim().toLowerCase();

  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (![r, g, b].some(Number.isNaN)) return [r, g, b];
    }
    return null;
  }

  if (value.startsWith("rgb")) {
    const m = value.match(/[\d.]+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    return null;
  }

  if (value.startsWith("hsl")) {
    const m = value.match(/[\d.]+/g);
    if (m && m.length >= 3) return hslToRgb(+m[0], +m[1], +m[2]);
    return null;
  }

  // Named colors (e.g. "yellow", "rebeccapurple"): let the browser resolve them.
  if (typeof document !== "undefined") {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const m = computed.match(/[\d.]+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  }

  return null;
}

/**
 * Get contrast color (black or white) based on background luminance.
 * Falls back to black (readable on the light backgrounds a highlight picker
 * typically produces) when the color cannot be parsed.
 */
function getContrastColor(bgColor: string): string {
  const rgb = parseColorToRgb(bgColor);
  if (!rgb) return "#000000";
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Insert horizontal rule
 */
export function insertHorizontalRule() {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const hr = document.createElement("hr");
  range.deleteContents();

  // Escape the caret's paragraph/heading first: inserting at a caret INSIDE a
  // <p> nests the <hr> (`<p><hr></p>` — invalid HTML that parsers restructure
  // on any round-trip). Splitting drops the <hr> between blocks instead.
  const start = range.startContainer;
  const startEl =
    start.nodeType === Node.ELEMENT_NODE
      ? (start as HTMLElement)
      : start.parentElement;
  const editableRoot = startEl?.closest<HTMLElement>(
    '[contenteditable="true"]'
  );
  const tail = editableRoot ? splitBlockAtCaret(range, editableRoot) : null;

  if (tail?.parentNode) {
    tail.parentNode.insertBefore(hr, tail);
    placeCaretInside(tail, true);
    return;
  }

  // Caret was already at block level (or outside a splittable block).
  range.insertNode(hr);
  const newRange = document.createRange();
  newRange.setStartAfter(hr);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

/**
 * Insert a checklist block at the caret. Any selected text becomes the first
 * item's label; otherwise an empty item is created. Like insertHorizontalRule,
 * the caret's paragraph/heading is split so the <ul> lands at block level and
 * never nests inside a <p> (which would corrupt on the next round-trip). The
 * item is `<li data-checked="false">` — no live <input> — so the sanitizer
 * preserves it and clicking its checkbox gutter toggles the state.
 * @param root - The editor root, used to split the caret's block.
 */
export function insertChecklist(root: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  // Capture any selected text before we may move out of a surrounding list.
  const selectedText = selection.getRangeAt(0).toString();

  // If the caret is inside a bullet/numbered list, drop the checklist AFTER that
  // list instead of nesting it as an indented sublist (matches insertTable and
  // the code-block inserter, which both exit list context first).
  const range = exitListContextIfNeeded(selection);
  if (!range) return;

  const ul = document.createElement("ul");
  ul.className = "checklist";
  const li = document.createElement("li");
  li.setAttribute("data-checked", "false");
  applyChecklistItemA11y(li, false);
  if (selectedText) {
    li.textContent = selectedText;
  } else {
    li.appendChild(document.createElement("br"));
  }
  ul.appendChild(li);

  range.deleteContents();

  const tail = splitBlockAtCaret(range, root);
  if (tail?.parentNode) {
    tail.parentNode.insertBefore(ul, tail);
  } else {
    range.insertNode(ul);
  }

  // Park the caret at the end of the item's label so typing continues in it.
  placeCaretInside(li, false);
}

/**
 * Check if cursor is inside a list and exit list context if needed
 * @returns The range to use for insertion (either original or adjusted)
 */
function exitListContextIfNeeded(selection: Selection): Range | null {
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  let node: Node | null = range.startContainer;

  // Find if we're inside a list
  let list: HTMLElement | null = null;

  while (node && node.nodeType !== Node.DOCUMENT_NODE) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "UL" || element.tagName === "OL") {
        list = element;
        break;
      }
    }
    node = node.parentNode;
  }

  // If we're inside a list, insert after the list instead
  if (list) {
    const newRange = document.createRange();
    newRange.setStartAfter(list);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return newRange;
  }

  return range;
}

/**
 * Insert a table at the current cursor position
 * @param root - Editor root element
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @param includeHeader - Whether to include a header row
 */
export function insertTable(
  root: HTMLElement,
  rows: number,
  cols: number,
  includeHeader: boolean
) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  // Clamp defensively: the modal's min/max are advisory, an empty field
  // arrives as NaN, and a large value builds thousands of cells synchronously
  // and can freeze the page. Bound to a sane 1–50 in each dimension.
  const safeCols = Math.min(50, Math.max(1, Math.floor(cols) || 1));
  const safeRows = Math.min(50, Math.max(1, Math.floor(rows) || 1));

  // Exit list context if we're inside a list
  const range = exitListContextIfNeeded(selection);
  if (!range) return;

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "16px";
  table.style.marginBottom = "16px";

  // Create header row if needed
  if (includeHeader) {
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (let j = 0; j < safeCols; j++) {
      const th = document.createElement("th");
      th.style.border = "1px solid #d1d5db";
      th.style.padding = "8px 12px";
      th.style.backgroundColor = "#f3f4f6";
      th.style.fontWeight = "600";
      th.style.textAlign = "left";
      th.style.color = "#111827"; // Override any inherited text color
      th.textContent = `Header ${j + 1}`;
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  // Create body rows. Keep at least one body row even when a header eats the
  // whole (already clamped) row budget, so a 1-row "with header" table still
  // has an editable cell.
  const tbody = document.createElement("tbody");
  const totalRows = includeHeader ? Math.max(1, safeRows - 1) : safeRows;

  for (let i = 0; i < totalRows; i++) {
    const tr = document.createElement("tr");

    for (let j = 0; j < safeCols; j++) {
      const td = document.createElement("td");
      td.style.border = "1px solid #d1d5db";
      td.style.padding = "8px 12px";
      td.textContent = "\u00A0"; // Non-breaking space
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  range.deleteContents();

  // Split the caret's paragraph/heading so the table lands BETWEEN blocks. A
  // caret mid-paragraph would otherwise nest the table as `<p>…<table>…</p>`,
  // which the HTML parser foster-parents out on the next sanitize round-trip,
  // reordering the paragraph (mirrors insertHorizontalRule).
  const tail = splitBlockAtCaret(range, root);
  if (tail?.parentNode) {
    tail.parentNode.insertBefore(table, tail);
  } else {
    range.insertNode(table);
  }

  // Move cursor after table
  const newRange = document.createRange();
  newRange.setStartAfter(table);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

/**
 * Search and replace text in content
 * @param html - HTML content
 * @param searchText - Text to search for
 * @param replaceText - Text to replace with
 * @param options - Search options
 * @returns Modified HTML
 */
export function searchAndReplace(
  html: string,
  searchText: string,
  replaceText: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): string {
  if (!searchText) return html;

  let flags = "g";
  if (!options.caseSensitive) flags += "i";

  let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);

  const temp = document.createElement("div");
  temp.innerHTML = html;

  const replaceInTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        node.textContent = node.textContent.replace(regex, replaceText);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(replaceInTextNodes);
    }
  };

  replaceInTextNodes(temp);
  return temp.innerHTML;
}

/**
 * Get the table element containing the current selection
 * @returns The table element or null
 */
export function getSelectedTable(): HTMLTableElement | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node = selection.anchorNode;
  while (node && node !== document.body) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).tagName === "TABLE"
    ) {
      return node as HTMLTableElement;
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * Get the table cell (td or th) containing the current selection
 * @returns The cell element or null
 */
export function getSelectedCell(): HTMLTableCellElement | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node = selection.anchorNode;
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "TD" || element.tagName === "TH") {
        return element as HTMLTableCellElement;
      }
    }
    node = node.parentNode;
  }
  return null;
}

/** A fresh styled data cell, matching the cells the table designer creates. */
function createTableCell(): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.style.border = "1px solid #d1d5db";
  cell.style.padding = "8px 12px";
  cell.textContent = "\u00A0"; // Non-breaking space
  return cell;
}

/** All body rows across EVERY tbody, in document order. (Derived from
 *  `table.rows` — happy-dom does not implement `HTMLTableSectionElement.rows`.) */
function allBodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.rows).filter(
    (row) => row.parentElement?.tagName === "TBODY"
  );
}

/**
 * Add a row to a table at the specified position.
 *
 * Merged-cell aware: the new row is sized from the table's VISUAL column
 * count (the old code copied rows[0].cells.length, so a colspan title row
 * made every added row ragged), a rowspan crossing the insertion boundary is
 * stretched instead of overlapped, and `atIndex` counts body rows across
 * EVERY tbody (not just the first).
 *
 * @param table - The table element
 * @param atIndex - Body-row index to insert before (default: end)
 */
export function addTableRow(table: HTMLTableElement, atIndex?: number): void {
  const bodyRows = allBodyRows(table);
  if (bodyRows.length === 0) return;

  const grid = buildTableGrid(table);
  const cols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  const refRow =
    atIndex !== undefined && atIndex < bodyRows.length
      ? bodyRows[atIndex]
      : null;
  // Grid row index of the insertion boundary (for rowspan detection).
  const boundary = refRow
    ? Array.from(table.rows).indexOf(refRow)
    : table.rows.length;

  const newRow = document.createElement("tr");
  const stretched = new Set<HTMLTableCellElement>();
  for (let c = 0; c < cols; c++) {
    // A cell whose rowspan covers BOTH sides of the boundary already occupies
    // this column in the new row \u2014 stretch it instead of adding a cell.
    const above = boundary > 0 ? grid[boundary - 1]?.[c] : undefined;
    const below = grid[boundary]?.[c];
    if (above && below && above.cell === below.cell) {
      if (!stretched.has(above.cell)) {
        above.cell.rowSpan += 1;
        stretched.add(above.cell);
      }
      continue;
    }
    newRow.appendChild(createTableCell());
  }

  if (refRow?.parentNode) {
    refRow.parentNode.insertBefore(newRow, refRow);
  } else {
    const lastTbody =
      table.tBodies[table.tBodies.length - 1] ||
      table.appendChild(document.createElement("tbody"));
    lastTbody.appendChild(newRow);
  }
}

/**
 * Remove a row from a table.
 *
 * Merged-cell aware: rowspans crossing the removed row are shrunk (the cell
 * survives in its origin row), a rowspan ORIGINATING in the removed row is
 * relocated to the following row with its span reduced, and `rowIndex` counts
 * body rows across EVERY tbody (the old code only saw tBodies[0]).
 *
 * @param table - The table element
 * @param rowIndex - Body-row index of the row to remove
 */
export function removeTableRow(
  table: HTMLTableElement,
  rowIndex: number
): void {
  const bodyRows = allBodyRows(table);
  if (bodyRows.length <= 1) return; // Keep at least one row

  const target = bodyRows[rowIndex];
  if (!target) return;

  const grid = buildTableGrid(table);
  const gridRow = Array.from(table.rows).indexOf(target);
  const nextDomRow = table.rows[gridRow + 1] ?? null;

  const seen = new Set<HTMLTableCellElement>();
  for (const slot of grid[gridRow] ?? []) {
    const cell = slot.cell;
    if (seen.has(cell)) continue;
    seen.add(cell);

    if (cell.parentElement === target) {
      // Originates in the removed row. A single-row cell just goes with it; a
      // rowspan cell survives by moving down one row with its span reduced.
      if (cell.rowSpan > 1 && nextDomRow) {
        cell.rowSpan -= 1;
        nextDomRow.insertBefore(cell, nextDomRow.cells[0] ?? null);
      }
    } else {
      // Crosses the removed row from above — one row shorter now.
      cell.rowSpan = Math.max(1, cell.rowSpan - 1);
    }
  }

  const section = target.parentElement;
  target.remove();
  // Drop a tbody the removal emptied so no hollow section lingers.
  if (section?.tagName === "TBODY" && !section.querySelector("tr")) {
    section.remove();
  }
}

/**
 * Add a column to a table at a VISUAL column index.
 *
 * Merged-cell aware: a cell whose colspan crosses the insertion point is
 * widened instead of having a stray cell slotted inside it, a rowspan cell at
 * the insertion point produces ONE new cell carrying the same rowspan (so
 * covered rows stay aligned), every row in every section (thead + all
 * tbodies + tfoot) is updated, and an existing <colgroup> gets a matching
 * <col>. The old code applied one raw DOM index to tHead + tBodies[0] only.
 *
 * @param table - The table element
 * @param atIndex - Visual column index to insert before (default: end)
 */
export function addTableColumn(
  table: HTMLTableElement,
  atIndex?: number
): void {
  const grid = buildTableGrid(table);
  const cols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  const at = Math.max(0, Math.min(atIndex ?? cols, cols));

  const widened = new Set<HTMLTableCellElement>();
  // Grid rows already covered by a new cell's rowspan.
  let coveredUntil = -1;

  for (let r = 0; r < grid.length; r++) {
    const domRow = table.rows[r];
    if (!domRow) continue;
    const inHead = domRow.parentElement?.tagName === "THEAD";
    const slot = grid[r][at];

    if (!slot) {
      // Short row or appending at the end.
      if (r <= coveredUntil) continue;
      domRow.appendChild(
        inHead ? createHeaderCell(at, domRow) : createTableCell()
      );
      continue;
    }

    const cell = slot.cell;
    // The cell's origin column within this grid row.
    let originCol = at;
    while (originCol > 0 && grid[r][originCol - 1]?.cell === cell) {
      originCol--;
    }

    if (originCol < at) {
      // Spans horizontally across the insertion point: absorb the new column.
      if (!widened.has(cell)) {
        cell.colSpan += 1;
        widened.add(cell);
      }
      continue;
    }

    if (r <= coveredUntil) continue;

    // The occupant sits exactly at the insertion point and is pushed right.
    // If it spans rows, the new cell must span the same rows or the covered
    // rows would end up one column short.
    let spanRows = 1;
    while (grid[r + spanRows]?.[at]?.cell === cell) spanRows++;
    const newCell = inHead
      ? createHeaderCell(at, domRow)
      : createTableCell();
    if (spanRows > 1) newCell.rowSpan = spanRows;
    coveredUntil = r + spanRows - 1;

    // Insert before the first cell of THIS DOM row whose origin column is at
    // or past the insertion point (the occupant may originate in an earlier
    // row via rowspan and not live in this DOM row at all).
    let anchor: HTMLTableCellElement | null = null;
    for (let c = at; c < grid[r].length; c++) {
      const candidate = grid[r][c];
      if (candidate.origin && candidate.cell.parentElement === domRow) {
        anchor = candidate.cell;
        break;
      }
    }
    domRow.insertBefore(newCell, anchor);
  }

  // Keep the column-width map aligned with the new column.
  const colgroup = table.querySelector("colgroup");
  if (colgroup) {
    const colEls = colgroup.querySelectorAll("col");
    const newCol = document.createElement("col");
    colgroup.insertBefore(newCol, colEls[at] ?? null);
  }
}

/** A fresh styled header cell (used when a column crosses a <thead> row). */
function createHeaderCell(
  atIndex: number,
  headerRow: HTMLTableRowElement
): HTMLTableCellElement {
  const th = document.createElement("th");
  th.style.border = "1px solid #d1d5db";
  th.style.padding = "8px 12px";
  th.style.backgroundColor = "#f3f4f6";
  th.style.fontWeight = "600";
  th.style.textAlign = "left";
  th.style.color = "#111827";
  th.textContent = `Header ${atIndex + 1}`;
  void headerRow;
  return th;
}

/**
 * Remove a column from a table
 * @param table - The table element
 * @param colIndex - Index of the column to remove
 */
export function removeTableColumn(
  table: HTMLTableElement,
  colIndex: number
): void {
  const grid = buildTableGrid(table);
  const cols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (cols <= 1) return; // Keep at least one column
  const at = Math.max(0, Math.min(colIndex, cols - 1));

  // Merged-cell aware: a cell spanning the removed column NARROWS (its content
  // survives); only a single-column cell is deleted. Every section's rows are
  // covered via the grid (the old code touched tHead + tBodies[0] only and
  // deleted whichever DOM cell happened to sit at the raw index).
  const processed = new Set<HTMLTableCellElement>();
  for (const row of grid) {
    const slot = row[at];
    if (!slot) continue;
    const cell = slot.cell;
    if (processed.has(cell)) continue;
    processed.add(cell);
    if (cell.colSpan > 1) {
      cell.colSpan -= 1;
    } else {
      cell.remove();
    }
  }

  // Keep the column-width map aligned.
  const colgroup = table.querySelector("colgroup");
  if (colgroup) {
    const colEls = colgroup.querySelectorAll("col");
    colEls[Math.min(at, colEls.length - 1)]?.remove();
  }
}

/**
 * Delete the entire table
 * @param table - The table element
 */
export function deleteTable(table: HTMLTableElement): void {
  table.remove();
}

/**
 * Apply properties to a table cell
 * @param cell - The table cell element
 * @param properties - Cell properties to apply
 */
export function applyCellProperties(
  cell: HTMLTableCellElement,
  properties: {
    backgroundColor?: string;
    textAlign?: string;
    verticalAlign?: string;
    padding?: number;
    width?: string;
    height?: string;
  }
): void {
  if (properties.backgroundColor !== undefined) {
    if (properties.backgroundColor) {
      cell.style.backgroundColor = properties.backgroundColor;
    } else {
      cell.style.backgroundColor = "";
    }
  }

  if (properties.textAlign !== undefined) {
    cell.style.textAlign = properties.textAlign;
  }

  if (properties.verticalAlign !== undefined) {
    cell.style.verticalAlign = properties.verticalAlign;
  }

  if (properties.padding !== undefined) {
    cell.style.padding = `${properties.padding}px`;
  }

  if (properties.width !== undefined) {
    cell.style.width = properties.width || "";
  }

  if (properties.height !== undefined) {
    cell.style.height = properties.height || "";
  }
}

/**
 * Apply properties to a table
 * @param table - The table element
 * @param properties - Table properties to apply
 */
export function applyTableProperties(
  table: HTMLTableElement,
  properties: {
    borderStyle?: string;
    borderWidth?: number;
    borderColor?: string;
    width?: string;
    backgroundColor?: string;
    borderCollapse?: boolean;
  }
): void {
  if (
    properties.borderStyle ||
    properties.borderWidth !== undefined ||
    properties.borderColor
  ) {
    const width = properties.borderWidth ?? 1;
    const style = properties.borderStyle || "solid";
    const color = properties.borderColor || "#d1d5db";

    // Apply to all cells
    const allCells = table.getElementsByTagName("td");
    const allHeaders = table.getElementsByTagName("th");

    const cells = [...Array.from(allCells), ...Array.from(allHeaders)];
    cells.forEach((cell) => {
      if (style === "none") {
        cell.style.border = "none";
      } else {
        cell.style.border = `${width}px ${style} ${color}`;
      }
    });
  }

  if (properties.width !== undefined) {
    table.style.width = properties.width;
  }

  if (properties.backgroundColor !== undefined) {
    if (properties.backgroundColor) {
      table.style.backgroundColor = properties.backgroundColor;
    } else {
      table.style.backgroundColor = "";
    }
  }

  if (properties.borderCollapse !== undefined) {
    table.style.borderCollapse = properties.borderCollapse
      ? "collapse"
      : "separate";
  }
}

/**
 * Get current cell properties
 * @param cell - The table cell element
 * @returns Current cell properties
 */
export function getCellProperties(cell: HTMLTableCellElement): {
  backgroundColor: string;
  textAlign: string;
  verticalAlign: string;
  padding: number;
  width: string;
  height: string;
} {
  const computedStyle = globalThis.getComputedStyle(cell);
  const padding = Number.parseInt(computedStyle.padding) || 8;

  return {
    backgroundColor: cell.style.backgroundColor || "",
    textAlign: cell.style.textAlign || computedStyle.textAlign || "left",
    verticalAlign:
      cell.style.verticalAlign || computedStyle.verticalAlign || "middle",
    padding: padding,
    width: cell.style.width || "",
    height: cell.style.height || "",
  };
}

/**
 * Get current table properties
 * @param table - The table element
 * @returns Current table properties
 */
/**
 * Normalize a CSS color to #rrggbb hex so it can populate an
 * <input type="color"> (which cannot parse rgb()/rgba() strings and would
 * otherwise fall back to black). Passes through empty values and existing hex.
 */
export function normalizeColorToHex(color: string): string {
  if (!color) return "";
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    // Expand shorthand #abc -> #aabbcc
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return (
        "#" +
        trimmed
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      ).toLowerCase();
    }
    return trimmed.toLowerCase();
  }
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
  );
  if (rgbMatch) {
    const toHex = (n: string) =>
      Math.max(0, Math.min(255, Number.parseInt(n, 10)))
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }
  return trimmed;
}

export function getTableProperties(table: HTMLTableElement): {
  borderStyle: string;
  borderWidth: number;
  borderColor: string;
  width: string;
  backgroundColor: string;
  borderCollapse: boolean;
} {
  const computedStyle = globalThis.getComputedStyle(table);

  // Get border properties from first cell
  const firstCell = table.querySelector<HTMLTableCellElement>("td, th");
  let borderStyle = "solid";
  let borderWidth = 1;
  let borderColor = "#d1d5db";

  if (firstCell) {
    const cellStyle = globalThis.getComputedStyle(firstCell);
    borderStyle = cellStyle.borderStyle || "solid";
    // Use a NaN guard, not `|| 1`, so a genuinely borderless table (0px) reads
    // back as 0 instead of collapsing to the default 1.
    const parsedWidth = Number.parseInt(cellStyle.borderWidth);
    borderWidth = Number.isNaN(parsedWidth) ? 1 : parsedWidth;
    // Normalize to hex so the color input shows the real color, not black.
    borderColor = normalizeColorToHex(cellStyle.borderColor) || "#d1d5db";
  }

  return {
    borderStyle,
    borderWidth,
    borderColor,
    width: table.style.width || computedStyle.width || "100%",
    backgroundColor: normalizeColorToHex(table.style.backgroundColor),
    borderCollapse: computedStyle.borderCollapse === "collapse",
  };
}
