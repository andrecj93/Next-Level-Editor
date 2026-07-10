/**
 * Block-level insertion helpers.
 *
 * contenteditable carets usually live INSIDE a paragraph/heading, so a naive
 * `range.insertNode(blockEl)` produces invalid nesting like
 * `<p><blockquote>…</blockquote></p>` or `<p><hr></p>` — HTML parsers silently
 * restructure that on any serialize/re-parse round-trip (v-model, sanitizer,
 * export), corrupting the document. These helpers split the caret's block so
 * block-level nodes land BETWEEN paragraphs, as siblings.
 *
 * Shared by the slash menu (Quote/Divider), the toolbar's Horizontal Rule and
 * any future block inserter — fix insertion behavior here, not per call site.
 */

/** Paragraph-like blocks that can be split to make room for a block insert. */
export const SPLITTABLE_BLOCKS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);

export const isEmptyBlock = (el: HTMLElement): boolean =>
  !el.textContent?.trim() && !el.querySelector("img,hr,table,video,iframe");

/** Find the closest paragraph/heading ancestor of the caret, if any. */
export const findSplittableBlock = (
  range: Range,
  root: HTMLElement
): HTMLElement | null => {
  const start = range.startContainer;
  let el: HTMLElement | null =
    start.nodeType === Node.ELEMENT_NODE
      ? (start as HTMLElement)
      : start.parentElement;
  while (el && el !== root) {
    if (SPLITTABLE_BLOCKS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
};

/** Collapse the selection to the start/end of `target`'s contents. */
export const placeCaretInside = (target: Node, atStart: boolean) => {
  const selection = globalThis.getSelection();
  if (!selection) return;
  const caret = document.createRange();
  caret.selectNodeContents(target);
  caret.collapse(atStart);
  selection.removeAllRanges();
  selection.addRange(caret);
};

/**
 * Split the caret's paragraph/heading in two so a block-level node can be
 * inserted BETWEEN the halves instead of nested inside the block.
 *
 * Leaves the caret collapsed at block level between the halves (so a
 * follow-up `Range.insertNode` lands as a sibling), drops the head half
 * when it ends up empty, and keeps an editable tail. Returns the tail
 * block, or null when the caret is not inside a splittable block.
 */
export const splitBlockAtCaret = (
  range: Range,
  root: HTMLElement
): HTMLElement | null => {
  const block = findSplittableBlock(range, root);
  const parent = block?.parentNode;
  if (!block || !parent) return null;

  const tail = block.cloneNode(false) as HTMLElement;
  const tailRange = document.createRange();
  tailRange.setStart(range.startContainer, range.startOffset);
  tailRange.setEnd(block, block.childNodes.length);
  tail.appendChild(tailRange.extractContents());
  if (isEmptyBlock(tail) && !tail.querySelector("br")) {
    tail.appendChild(document.createElement("br"));
  }
  parent.insertBefore(tail, block.nextSibling);
  if (isEmptyBlock(block)) block.remove();

  // Park the caret between the two halves, at block level.
  const selection = globalThis.getSelection();
  if (selection) {
    const caret = document.createRange();
    caret.setStart(
      parent,
      Array.prototype.indexOf.call(parent.childNodes, tail)
    );
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
  }
  return tail;
};
