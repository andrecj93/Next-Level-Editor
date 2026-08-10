/**
 * Block-boundary merge helpers — the Backspace/Delete inverse of the Enter
 * split model in `blockInsertion.ts`.
 *
 * The editor produces clean `<p>` splits on Enter, but native contenteditable
 * merging on Backspace/Delete is browser-dependent: merging a paragraph into
 * a heading can wrap the moved text in `<span style>` soup, spawn stray
 * `<div>`s, or inherit the target block's inline formatting. These helpers
 * implement a deterministic merge instead:
 *
 * - The TARGET block's tag wins the block identity (Word behavior).
 * - The source block's child nodes move AS-IS — inline marks the user applied
 *   (`<strong>`, `<em>`, links…) survive; nothing is re-wrapped and no
 *   `style` attributes are introduced.
 * - Placeholder `<br>`s on either side of the join are dropped so the merge
 *   never leaves a phantom line break mid-paragraph.
 * - Complex structures (tables, embeds) are never merged INTO — callers get
 *   `null` and should fall back to native handling (a safe no-op).
 *
 * All functions are pure DOM operations with no selection side effects; they
 * RETURN the join-point caret so the caller can place it exactly (no jump).
 */

import { SPLITTABLE_BLOCKS } from "./blockInsertion";

/**
 * Blocks that participate in Backspace/Delete merging. Aligned with the
 * Enter-split model (`SPLITTABLE_BLOCKS`) plus blockquote, which splits via
 * its inner paragraphs but merges as a unit when the caret sits directly
 * inside it.
 */
export const MERGEABLE_BLOCKS: Set<string> = new Set([
  ...Array.from(SPLITTABLE_BLOCKS),
  "BLOCKQUOTE",
]);

/** Where the caller should place the collapsed caret after a merge. */
export interface MergeCaret {
  caretNode: Node;
  caretOffset: number;
}

/** Elements with visual presence even when there is no text. */
const MEDIA_SELECTOR = "img,hr,table,video,iframe";

/**
 * True when the block renders as an empty line: no text and no media. A
 * placeholder `<br>` (or empty inline wrappers) may still be present.
 */
export const isVisuallyEmptyBlock = (el: HTMLElement): boolean =>
  !el.textContent?.trim() && !el.querySelector(MEDIA_SELECTOR);

/** Structures we never merge INTO — corrupting them is worse than a no-op. */
const isComplexNeighbor = (el: Element): boolean =>
  el.tagName === "TABLE" || el.classList.contains("embedded-resizable-container");

/**
 * Clear a visually empty block's placeholder content (`<br>`, empty inline
 * wrappers, whitespace text) so a merge doesn't carry a stray line break
 * into the middle of the joined block. No-op when the block has real content.
 */
const stripPlaceholderContent = (el: HTMLElement) => {
  if (!isVisuallyEmptyBlock(el)) return;
  el.textContent = "";
};

/**
 * Move ALL of `source`'s child nodes to the end of `target` as-is and return
 * the caret at the exact join point. Does NOT remove `source` — callers do,
 * because for `<li>` targets the empty source may be the list itself's
 * responsibility.
 */
const mergeChildrenInto = (
  target: HTMLElement,
  source: HTMLElement
): MergeCaret => {
  stripPlaceholderContent(target);
  stripPlaceholderContent(source);

  const joinIndex = target.childNodes.length;
  while (source.firstChild) {
    target.appendChild(source.firstChild);
  }

  // Both sides were placeholder-only: keep the merged block visible.
  if (target.childNodes.length === 0) {
    target.appendChild(document.createElement("br"));
    return { caretNode: target, caretOffset: 0 };
  }

  // Prefer a text-node caret at the join — it is what browsers expect for
  // collapsed carets between words. Normalize first: a text-node boundary at
  // the join ("Hello" + "World") would otherwise leave two adjacent text
  // nodes, which makes subsequent caret movement and DOM ops erratic. The
  // node BEFORE the join survives normalization (followers merge into it),
  // and its pre-merge length marks the exact join offset.
  const before = joinIndex > 0 ? target.childNodes[joinIndex - 1] : null;
  if (
    before &&
    before.nodeType === Node.TEXT_NODE &&
    (before as Text).length > 0
  ) {
    const joinOffset = (before as Text).length;
    target.normalize();
    return { caretNode: before, caretOffset: joinOffset };
  }
  target.normalize();
  return { caretNode: target, caretOffset: Math.min(joinIndex, target.childNodes.length) };
};

/** Caret collapsed at the very start of `block`'s content. */
const caretAtStart = (block: HTMLElement): MergeCaret => {
  const first = block.firstChild;
  if (first && first.nodeType === Node.TEXT_NODE) {
    return { caretNode: first, caretOffset: 0 };
  }
  return { caretNode: block, caretOffset: 0 };
};

/** Caret collapsed at the very end of `block`'s content. */
const caretAtEnd = (block: HTMLElement): MergeCaret => {
  // In an empty block the caret sits BEFORE the placeholder <br>.
  if (isVisuallyEmptyBlock(block)) {
    return { caretNode: block, caretOffset: 0 };
  }
  const last = block.lastChild;
  if (last && last.nodeType === Node.TEXT_NODE) {
    return { caretNode: last, caretOffset: (last as Text).length };
  }
  return { caretNode: block, caretOffset: block.childNodes.length };
};

/** Direct `<li>` children of a list element. */
const listItems = (list: Element): HTMLElement[] =>
  Array.from(list.children).filter(
    (c): c is HTMLElement => c.tagName === "LI"
  );

/**
 * Backspace with the caret collapsed at the VERY START of `block`: merge it
 * into whatever precedes it.
 *
 * - previous `<hr>`  → remove the rule, keep the block (first Backspace eats
 *   the rule — Word behavior); caret stays at block start.
 * - previous mergeable block → move `block`'s children to its end as-is,
 *   remove the emptied `block`; caret lands at the join point.
 * - previous list → merge into its LAST `<li>`.
 * - first child of root / table / embed / anything else → `null`
 *   (let native handle it — a safe no-op).
 */
export const mergeBlockBackward = (
  block: HTMLElement,
  root: HTMLElement
): MergeCaret | null => {
  if (!root.contains(block)) return null;

  const prev = block.previousElementSibling as HTMLElement | null;
  if (!prev) return null; // First block: nothing to merge into.

  if (prev.tagName === "HR") {
    prev.remove();
    return caretAtStart(block);
  }

  if (isComplexNeighbor(prev)) return null;

  if (prev.tagName === "UL" || prev.tagName === "OL") {
    const items = listItems(prev);
    const lastItem = items[items.length - 1];
    if (!lastItem) return null;
    const caret = mergeChildrenInto(lastItem, block);
    block.remove();
    return caret;
  }

  if (!MERGEABLE_BLOCKS.has(prev.tagName)) return null;

  const caret = mergeChildrenInto(prev, block);
  block.remove();
  return caret;
};

/**
 * Delete with the caret collapsed at the VERY END of `block`: pull the next
 * sibling's content up into `block`. Mirror of {@link mergeBlockBackward}:
 *
 * - next `<hr>` → remove it; caret stays put (at the end of `block`).
 * - next mergeable block → move ITS children to the end of `block`, remove it.
 * - next list → pull the FIRST `<li>`'s content up (and drop the list when
 *   that empties it).
 * - last block / table / embed / anything else → `null` (native no-op).
 */
export const mergeBlockForward = (
  block: HTMLElement,
  root: HTMLElement
): MergeCaret | null => {
  if (!root.contains(block)) return null;

  const next = block.nextElementSibling as HTMLElement | null;
  if (!next) return null; // Last block: nothing to pull up.

  if (next.tagName === "HR") {
    next.remove();
    return caretAtEnd(block);
  }

  if (isComplexNeighbor(next)) return null;

  if (next.tagName === "UL" || next.tagName === "OL") {
    const firstItem = listItems(next)[0];
    if (!firstItem) return null;
    const caret = mergeChildrenInto(block, firstItem);
    firstItem.remove();
    if (listItems(next).length === 0) next.remove();
    return caret;
  }

  if (!MERGEABLE_BLOCKS.has(next.tagName)) return null;

  const caret = mergeChildrenInto(block, next);
  next.remove();
  return caret;
};

/** Block-level tags whose presence means the surface still has a block. */
const BLOCK_LEVEL_TAGS = new Set([
  ...Array.from(SPLITTABLE_BLOCKS),
  "BLOCKQUOTE",
  "UL",
  "OL",
  "TABLE",
  "PRE",
  "HR",
  "DIV",
  "FIGURE",
  "SECTION",
  "ARTICLE",
]);

/**
 * Repair the surface after a deletion that removed every block element
 * (e.g. Ctrl+A + Backspace can leave raw text or a bare `<br>` at root
 * level). Stray root-level inline/text nodes get wrapped into a `<p>` so
 * typing continues inside a proper block.
 *
 * A truly EMPTY root is deliberately left alone — the editor's `:empty`
 * placeholder styling depends on it, so we never seed `<p><br></p>` here.
 *
 * Returns true when the DOM was changed.
 */
export const ensureBlockRemains = (root: HTMLElement): boolean => {
  if (!root.hasChildNodes()) return false; // Truly empty: leave for :empty.

  const hasBlock = Array.from(root.children).some((c) =>
    BLOCK_LEVEL_TAGS.has(c.tagName)
  );
  if (hasBlock) return false;

  // Only wrap when something meaningful is stranded — whitespace-only text
  // nodes are as good as empty and not worth materializing a paragraph for.
  const hasStrayContent = Array.from(root.childNodes).some(
    (n) =>
      n.nodeType === Node.ELEMENT_NODE ||
      (n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim())
  );
  if (!hasStrayContent) return false;

  const paragraph = document.createElement("p");
  while (root.firstChild) {
    paragraph.appendChild(root.firstChild);
  }
  root.appendChild(paragraph);
  return true;
};
