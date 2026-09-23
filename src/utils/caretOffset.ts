/**
 * Structure-agnostic caret persistence for undo/redo.
 *
 * Undo/redo restores a document by replacing innerHTML wholesale, which
 * destroys the live selection and drops the caret to the top of the editor.
 * To survive that, we record the caret as a pair of PLAIN-TEXT character
 * offsets (start/end) measured from the beginning of the editor's text content,
 * then map those offsets back onto the freshly-restored DOM. Because a snapshot
 * restores the exact HTML it was captured from, the text length is identical
 * and the offsets land on the same characters.
 */

export interface CaretOffsets {
  start: number;
  end: number;
}

/** Text length from the start of `root` up to the (container, offset) point. */
function pointOffset(
  root: HTMLElement,
  container: Node,
  offset: number
): number {
  const pre = root.ownerDocument.createRange();
  pre.selectNodeContents(root);
  try {
    pre.setEnd(container, offset);
  } catch {
    // Offset out of range for the container — treat as the whole prefix.
    return pre.toString().length;
  }
  return pre.toString().length;
}

/**
 * Capture the current selection as text-offsets within `root`, or null when
 * there is no selection inside this editor.
 */
export function getCaretOffsets(root: HTMLElement): CaretOffsets | null {
  const view = root.ownerDocument.defaultView ?? globalThis;
  const sel = view.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  ) {
    return null;
  }

  return {
    start: pointOffset(root, range.startContainer, range.startOffset),
    end: pointOffset(root, range.endContainer, range.endOffset),
  };
}

/** Map a text-offset back to a concrete (textNode, offset) position. */
function locate(
  root: HTMLElement,
  target: number,
  preferNext = false
): { node: Node; offset: number } {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );
  let remaining = Math.max(0, target);
  let last: Node | null = null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const len = node.textContent?.length ?? 0;
    last = node;
    if (remaining < len || (remaining === len && !preferNext)) {
      return { node, offset: remaining };
    }
    remaining -= len;
  }
  // Past the end (or no text nodes at all): clamp to the end of the last text
  // node, or the root itself when the document is empty.
  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return { node: root, offset: 0 };
}

/**
 * Restore a previously-captured caret/selection onto `root`. No-op when
 * `offsets` is null. Returns true if a selection was applied.
 */
export function setCaretOffsets(
  root: HTMLElement,
  offsets: CaretOffsets | null
): boolean {
  if (!offsets) return false;
  const view = root.ownerDocument.defaultView ?? globalThis;
  const sel = view.getSelection?.();
  if (!sel) return false;

  // At a boundary, a selection starts in the next text node, not at the end
  // of the previous paragraph (which would also select its rendered newline).
  const startPos = locate(root, offsets.start, offsets.start !== offsets.end);
  const endPos = locate(root, offsets.end);

  const range = root.ownerDocument.createRange();
  try {
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
  } catch {
    return false;
  }
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}
