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

/** Scroll the focus end of a selection without inserting nodes into the range.
 * A temporary scroll marker can change the live selection and the next command.
 * Read geometry instead, moving inner scroll containers before the host page. */
export function keepSelectionVisible(root: HTMLElement | null) {
  const selection = window.getSelection();
  if (!root || !selection?.rangeCount || !selection.focusNode ||
      !root.contains(selection.focusNode)) return;
  const selectedRange = selection.getRangeAt(0);
  const caret = selectedRange.cloneRange();
  caret.setStart(selection.focusNode, selection.focusOffset);
  caret.collapse(true);
  const rect = () => {
    const focusRect = caret.getBoundingClientRect();
    return focusRect.height ? focusRect : selectedRange.getBoundingClientRect();
  };
  const initial = rect();
  if (!initial.height) return;
  const delta = (start: number, end: number, low: number, high: number) =>
    end > high ? end - high : start < low ? start - low : 0;
  let parent = selection.focusNode instanceof Element
    ? selection.focusNode : selection.focusNode.parentElement;
  while (parent && parent !== document.scrollingElement) {
    if (parent instanceof HTMLElement) {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      const focusRect = rect();
      if (/auto|scroll/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
        parent.scrollTop += delta(focusRect.top, focusRect.bottom, box.top + 4, box.bottom - 4);
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
