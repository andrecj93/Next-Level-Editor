/**
 * Selection ↔ element contact test for block commands (alignment, list ops,
 * multi-block wraps).
 *
 * `Range.intersectsNode` is the wrong tool for "which blocks did the user
 * select": a selection whose END boundary sits INSIDE the next block at
 * (firstChild, 0) — exactly the representation triple-click and Shift+Down
 * produce — has selected ZERO characters of that block yet intersects it,
 * dragging an untouched block into the command. (At the parent-level
 * (parent, i) representation intersectsNode is spec-strict, so the leak only
 * bites on real browser selections.)
 */

/**
 * Whether `range` genuinely touches `el`:
 * - a COLLAPSED caret uses inclusive containment — a caret at offset 0 of a
 *   block overlaps nothing but must still target its own block (the classic
 *   regression trap for strict-overlap fixes);
 * - a real selection is clamped to the element's content range and must
 *   actually CAPTURE something: text, or a text-less element (img/br/hr/
 *   table/iframe/video — so an image-only block still counts). Zero-width
 *   boundary contact, in either representation, does not count.
 */
/**
 * A copy of `range` clamped to `el`'s CONTENT range: boundaries outside the
 * element are pulled to its content edges. Single-block commands must operate
 * on this, never on the raw selection — the physical range can still END inside
 * an excluded neighbouring block (the triple-click representation), and
 * extractContents() on the raw range rips across the boundary, nesting block
 * clones inside inline elements.
 */
export function clampRangeToElement(range: Range, el: Element): Range {
  const content = el.ownerDocument.createRange();
  content.selectNodeContents(el);
  const clamped = range.cloneRange();
  if (clamped.compareBoundaryPoints(Range.START_TO_START, content) < 0) {
    clamped.setStart(content.startContainer, content.startOffset);
  }
  if (clamped.compareBoundaryPoints(Range.END_TO_END, content) > 0) {
    clamped.setEnd(content.endContainer, content.endOffset);
  }
  return clamped;
}

/**
 * Whether a range actually captures CONTENT (text, or a text-less element like
 * an image). False for a collapsed range and for pure boundary-touch
 * selections. Used to distinguish "nothing selected → no-op" from "bare inline
 * content under the root with no block wrapper → style the raw range".
 */
export function rangeCapturesContent(range: Range): boolean {
  if (range.collapsed) return false;
  if (range.toString().length > 0) return true;
  return (
    range
      .cloneContents()
      .querySelector("img, br, hr, table, iframe, video") !== null
  );
}

export function rangeTouchesElement(range: Range, el: Element): boolean {
  const content = el.ownerDocument.createRange();
  content.selectNodeContents(el);

  if (range.collapsed) {
    return (
      range.compareBoundaryPoints(Range.START_TO_START, content) >= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, content) <= 0
    );
  }

  // Entirely before / after the element's content → no touch. Also rejects a
  // zero-overlap boundary expressed at the PARENT level ((parent, i)).
  if (range.compareBoundaryPoints(Range.START_TO_END, content) <= 0) {
    return false; // range.end ≤ content.start
  }
  if (range.compareBoundaryPoints(Range.END_TO_START, content) >= 0) {
    return false; // range.start ≥ content.end
  }

  // The boundary can sit INSIDE the element while selecting none of it. Clamp
  // the range to the element's content and require a real capture.
  const clamped = clampRangeToElement(range, el);
  if (clamped.collapsed) return false;
  if (clamped.toString().length > 0) return true;
  return (
    clamped
      .cloneContents()
      .querySelector("img, br, hr, table, iframe, video") !== null
  );
}
