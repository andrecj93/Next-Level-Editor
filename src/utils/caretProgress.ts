/**
 * Caret "playhead" progress for the receded-chrome letterbox filament: how
 * far through the document the caret currently sits, as a 0..1 fraction of
 * the editor's scrollable content height. The host renders it as a thin
 * progress line while the chrome is receded — the writing equivalent of a
 * video player's seek bar.
 *
 * Pure and unthrottled by design: selectionchange fires a lot, so the HOST
 * throttles calls; this function just measures.
 */

/**
 * Resolve the caret's vertical position through `root`'s scrollable content
 * as a fraction in [0, 1].
 *
 * Measurement: the selection's focus point is materialised as a collapsed
 * range and its client rect taken. An empty block yields a degenerate 0-rect
 * from Range.getBoundingClientRect() (same quirk useSlashCommands works
 * around), so we fall back to the closest element's rect. The rect midpoint
 * is then converted from viewport space into content space
 * (`- rootRect.top + root.scrollTop`) and divided by `root.scrollHeight`.
 *
 * Returns null when there is nothing meaningful to report: no selection,
 * the focus lives outside `root`, or the scroll height is degenerate.
 */
export function getCaretDocumentProgress(root: HTMLElement): number | null {
  const doc = root.ownerDocument;
  if (!doc || typeof doc.getSelection !== "function") return null;

  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const { focusNode, focusOffset } = selection;
  if (!focusNode || !root.contains(focusNode)) return null;

  const scrollHeight = root.scrollHeight;
  if (!Number.isFinite(scrollHeight) || scrollHeight <= 0) return null;

  let rect: DOMRect;
  try {
    const range = doc.createRange();
    range.setStart(focusNode, focusOffset);
    range.collapse(true);
    rect = range.getBoundingClientRect();
  } catch {
    // setStart throws on stale offsets (selection read mid-mutation).
    return null;
  }

  // Empty-block fallback: a collapsed range inside an empty element reports
  // an all-zero rect, so use the nearest element's rect instead (the caret
  // sits at the top of that block — close enough for a progress filament).
  if (rect.width === 0 && rect.height === 0 && rect.top === 0) {
    const element =
      focusNode.nodeType === Node.ELEMENT_NODE
        ? (focusNode as HTMLElement)
        : focusNode.parentElement;
    if (!element) return null;
    rect = element.getBoundingClientRect();
  }

  const rootRect = root.getBoundingClientRect();
  const caretMidY = rect.top + rect.height / 2;
  const progress = (caretMidY - rootRect.top + root.scrollTop) / scrollHeight;

  return Math.min(1, Math.max(0, progress));
}
