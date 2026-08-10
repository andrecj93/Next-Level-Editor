/**
 * Caret "playhead" progress for the receded-chrome letterbox filament: how
 * far through the document CONTENT the caret currently sits, as a 0..1
 * fraction. The host renders it as a thin progress line while the chrome is
 * receded — the writing equivalent of a video player's seek bar.
 *
 * Pure and unthrottled by design: selectionchange fires a lot, so the HOST
 * throttles calls; this function just measures.
 */

/**
 * Resolve the caret's vertical position through `root`'s content as a
 * fraction in [0, 1].
 *
 * Measurement: the selection's focus point is materialised as a collapsed
 * range and its client rect taken. An empty block yields a degenerate 0-rect
 * from Range.getBoundingClientRect() (same quirk useSlashCommands works
 * around), so we fall back to the closest element's rect.
 *
 * Normalisation: progress is measured against the CONTENT EXTENT — the span
 * from the top of `root`'s first element child to the bottom of its last —
 * NOT against `root.scrollHeight`. The editor pane is flex-stretched, so for
 * any document shorter than the visible pane scrollHeight equals the mostly
 * empty pane height and the old math read "caret y within the pane" instead
 * of "how far through the document"; content-extent math also inherently
 * discounts the pane's top/bottom paddings, which used to cap long documents
 * at ~95%. The caret's TOP edge is compared against the content top, and one
 * caret-line height is subtracted from the denominator, so the FIRST line
 * reads 0 and the LAST line reads 1 for short and long documents alike.
 * All rects are read in the same viewport space at the same instant, so no
 * scrollTop / root-offset conversion is needed — it cancels out.
 *
 * Returns null when there is nothing meaningful to report: no selection,
 * the focus lives outside `root`, `root` has no element content, or the
 * content extent is degenerate (zero/negative span).
 */
export function getCaretDocumentProgress(root: HTMLElement): number | null {
  const doc = root.ownerDocument;
  if (!doc || typeof doc.getSelection !== "function") return null;

  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const { focusNode, focusOffset } = selection;
  if (!focusNode || !root.contains(focusNode)) return null;

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

  // Content extent: first block's top to last block's bottom, in viewport
  // space (same space as the caret rect, so offsets cancel).
  const first = root.firstElementChild;
  const last = root.lastElementChild;
  if (!first || !last) return null;
  const contentTop = first.getBoundingClientRect().top;
  const contentBottom = last.getBoundingClientRect().bottom;
  const span = contentBottom - contentTop;
  if (!Number.isFinite(span) || span <= 0) return null;

  // Subtract one caret-line so the last LINE (not one line past the end)
  // maps to 1.0. A document that fits on a single line degenerates to a
  // denominator of 1 and reads ~0 — there is no "progress" through one line.
  const denominator = Math.max(span - rect.height, 1);
  const progress = (rect.top - contentTop) / denominator;

  return Math.min(1, Math.max(0, progress));
}
