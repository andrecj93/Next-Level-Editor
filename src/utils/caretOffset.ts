/**
 * Caret persistence across restored document snapshots.
 *
 * Undo/redo restores a document by replacing innerHTML wholesale, which
 * destroys the live selection and drops the caret to the top of the editor.
 * Text offsets provide a fallback if inline wrappers change. History also
 * captures DOM paths and direction: text offsets alone cannot distinguish an
 * empty paragraph, either side of a line break, or a boundary outside emphasis.
 */

export interface CaretOffsets {
  start: number;
  end: number;
  /** Exact DOM boundaries for history snapshots; text offsets remain a fallback. */
  points?: { start: CaretPoint; end: CaretPoint; backwards: boolean };
}

interface CaretPoint { path: number[]; offset: number }

function capturePoint(root: HTMLElement, node: Node, offset: number): CaretPoint {
  const path: number[] = [];
  while (node !== root && node.parentNode) {
    path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node));
    node = node.parentNode;
  }
  return { path, offset };
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
export function getCaretOffsets(root: HTMLElement, includeDomPoints = false): CaretOffsets | null {
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

  const offsets: CaretOffsets = {
    start: pointOffset(root, range.startContainer, range.startOffset),
    end: pointOffset(root, range.endContainer, range.endOffset),
  };
  if (includeDomPoints) offsets.points = {
    start: capturePoint(root, range.startContainer, range.startOffset),
    end: capturePoint(root, range.endContainer, range.endOffset),
    backwards: !range.collapsed && sel.anchorNode === range.endContainer && sel.anchorOffset === range.endOffset,
  };
  return offsets;
}

function restorePoint(root: HTMLElement, point: CaretPoint | undefined, expected: number) {
  if (!point) return null;
  let node: Node = root;
  for (const index of point.path) {
    const child = node.childNodes[index];
    if (!child) return null;
    node = child;
  }
  const length = node.nodeType === Node.TEXT_NODE ? node.textContent?.length ?? 0 : node.childNodes.length;
  if (point.offset < 0 || point.offset > length || pointOffset(root, node, point.offset) !== expected) return null;
  return { node, offset: point.offset };
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
  const startPos = restorePoint(root, offsets.points?.start, offsets.start)
    ?? locate(root, offsets.start, offsets.start !== offsets.end);
  const endPos = restorePoint(root, offsets.points?.end, offsets.end) ?? locate(root, offsets.end);

  const range = root.ownerDocument.createRange();
  try {
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
  } catch {
    return false;
  }
  sel.removeAllRanges();
  sel.addRange(range);
  if (offsets.points?.backwards && !range.collapsed && sel.setBaseAndExtent) {
    sel.setBaseAndExtent(endPos.node, endPos.offset, startPos.node, startPos.offset);
  }
  return true;
}
