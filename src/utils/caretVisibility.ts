/** Keep a focused insertion point above fixed controls without moving selection. */
export function keepCaretAboveToolbar(toolbar: HTMLElement, root: HTMLElement | null) {
  const selection = window.getSelection();
  if (!root || !selection?.isCollapsed || !selection.rangeCount ||
      !root.contains(document.activeElement)) return;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return;
  const bottom = toolbar.getBoundingClientRect().top - 12;
  if (bottom <= 0) return;
  const caretRect = () => range.getBoundingClientRect();
  if (caretRect().height === 0 || caretRect().bottom <= bottom) return;

  // Scroll the inner editing surface first when it is already visible.
  // An editor below the fold needs its host/page to move instead; scrolling
  // its content alone would hide the first line behind its own toolbar.
  let parent = range.startContainer instanceof Element
    ? range.startContainer : range.startContainer.parentElement;
  while (parent && parent !== document.scrollingElement) {
    if (parent instanceof HTMLElement && /auto|scroll/.test(getComputedStyle(parent).overflowY)) {
      const viewport = parent.getBoundingClientRect();
      const caret = caretRect();
      const available = Math.max(0, caret.top - viewport.top - 8);
      const delta = Math.min(caret.bottom - bottom, available);
      if (delta > 0 && viewport.top < bottom) parent.scrollTop += delta;
    }
    parent = parent.parentElement;
  }
  const remaining = caretRect().bottom - bottom;
  if (remaining > 0) window.scrollBy({ top: remaining, behavior: "instant" });
}

/** Browsers can leave the focus between inline elements after formatting.
 * Collapsing that DOM boundary gives a zero rectangle; measure the adjacent
 * character (or an empty line's element) without inserting a marker. */
function selectionFocusRect(selection: Selection): DOMRect {
  const selected = selection.getRangeAt(0);
  const caret = selected.cloneRange();
  const node = selection.focusNode!;
  const offset = selection.focusOffset;
  caret.setStart(node, offset);
  caret.collapse(true);
  const rect = caret.getBoundingClientRect();
  if (rect.height) return rect;

  const forward = node.nodeType === Node.TEXT_NODE
    ? offset < (node.textContent?.length ?? 0) : offset < node.childNodes.length;
  let adjacent = node.nodeType === Node.TEXT_NODE ? node
    : node.childNodes[forward ? offset : offset - 1] ?? node;
  while (adjacent.childNodes.length) adjacent = forward ? adjacent.firstChild! : adjacent.lastChild!;
  if (adjacent.nodeType === Node.TEXT_NODE && adjacent.textContent?.length) {
    const length = adjacent.textContent.length;
    const position = adjacent === node ? Math.min(offset, length - 1) : forward ? 0 : length - 1;
    caret.setStart(adjacent, position);
    caret.setEnd(adjacent, position + 1);
    const character = caret.getBoundingClientRect();
    if (character.height) return character;
  }
  const selectedRect = selected.getBoundingClientRect();
  if (selectedRect.height) return selectedRect;
  const element = adjacent.nodeType === Node.ELEMENT_NODE ? adjacent as Element : adjacent.parentElement;
  return element?.getBoundingClientRect() ?? rect;
}

/** Scroll the focus end of a selection without inserting nodes into the range.
 * A temporary scroll marker can change the live selection and the next command.
 * Read geometry instead, moving inner scroll containers before the host page. */
export function keepSelectionVisible(root: HTMLElement | null, margin = 4) {
  const selection = window.getSelection();
  if (!root || !selection?.rangeCount || !selection.focusNode ||
      !root.contains(selection.focusNode)) return;
  const rect = () => selectionFocusRect(selection);
  revealTextRect(selection.focusNode, rect, margin);
}

/** Reveal a search match while keyboard focus stays in the search field. */
export function keepRangeVisible(root: HTMLElement | null, range: Range, margin = 24) {
  if (!root || !root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
  revealTextRect(range.startContainer, () => range.getClientRects()[0] ?? range.getBoundingClientRect(), margin);
}

function revealTextRect(node: Node, rect: () => DOMRect, margin: number) {
  const initial = rect();
  if (!initial.height) return;
  const delta = (start: number, end: number, low: number, high: number) =>
    end > high ? end - high : start < low ? start - low : 0;
  let parent = node instanceof Element ? node : node.parentElement;
  while (parent && parent !== document.scrollingElement) {
    if (parent instanceof HTMLElement) {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      const focusRect = rect();
      if (/auto|scroll/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
        const inset = Math.min(margin, Math.max(0, (box.bottom - box.top) / 3));
        parent.scrollTop += delta(focusRect.top, focusRect.bottom, box.top + inset, box.bottom - inset);
      }
      if (/auto|scroll/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth) {
        parent.scrollLeft += delta(focusRect.left, focusRect.right, box.left + 4, box.right - 4);
      }
    }
    parent = parent.parentElement;
  }
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const left = viewport?.offsetLeft ?? 0;
  const focusRect = rect();
  const dy = delta(focusRect.top, focusRect.bottom, top + 8, top + (viewport?.height ?? innerHeight) - 8);
  const dx = delta(focusRect.left, focusRect.right, left + 8, left + (viewport?.width ?? innerWidth) - 8);
  if (dx || dy) window.scrollBy({ top: dy, left: dx, behavior: 'instant' });
}

/** Capture whether the writer's line is visible before a toolbar or panel
 * resizes the page. Run the returned callback after layout to keep that line
 * visible, while leaving a manually scrolled-away selection alone. */
export function preserveVisibleSelection(root: HTMLElement | null, preserveReadingPosition = false): () => void {
  const selection = root?.ownerDocument.getSelection();
  if (!root || !selection?.rangeCount || !selection.focusNode ||
      !root.contains(selection.focusNode)) return () => {};
  const rect = selectionFocusRect(selection);
  const bounds = root.getBoundingClientRect();
  const view = root.ownerDocument.defaultView;
  const viewport = view?.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const bottom = top + (viewport?.height ?? view?.innerHeight ?? 0);
  const visible = rect.height > 0 && rect.top >= Math.max(bounds.top, top) &&
    rect.bottom <= Math.min(bounds.bottom, bottom);
  // Some browsers scroll back to the focused caret during reflow. If the
  // writer was reading elsewhere, preserve that paragraph instead. Use its
  // relative position so changing line wraps does not jump to another chapter.
  const previousTop = root.scrollTop;
  const anchor = !visible && preserveReadingPosition && previousTop > 0
    ? Array.from(root.children).find(child => child.getBoundingClientRect().bottom > bounds.top)
    : undefined;
  const anchorRect = anchor?.getBoundingClientRect();
  const fraction = anchorRect?.height ? (bounds.top - anchorRect.top) / anchorRect.height : 0;
  return () => {
    if (!root.isConnected) return;
    if (visible) keepSelectionVisible(root, 24);
    else if (preserveReadingPosition) {
      if (anchor?.isConnected && root.contains(anchor)) {
        const next = anchor.getBoundingClientRect();
        root.scrollTop += next.top - root.getBoundingClientRect().top + fraction * next.height;
      } else root.scrollTop = previousTop;
    }
  };
}
