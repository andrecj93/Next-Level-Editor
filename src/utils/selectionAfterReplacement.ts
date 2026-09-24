import { getCaretOffsets, setCaretOffsets } from './caretOffset';
import { captureSelectionBookmark } from './selectionBookmark';

/** Keep the writer's place when a separate control replaces a passage. */
export function preserveSelectionAfterTextReplacement(root: HTMLElement, target: Range, replacement: string) {
  const selection = root.ownerDocument.getSelection();
  const offsets = getCaretOffsets(root);
  if (!selection?.rangeCount || !offsets || !root.contains(target.startContainer) || !root.contains(target.endContainer)) return null;
  const selected = selection.getRangeAt(0);
  const backwards = !selected.collapsed && selection.anchorNode === selected.endContainer
    && selection.anchorOffset === selected.endOffset;
  const bookmark = captureSelectionBookmark(root);
  const prefix = root.ownerDocument.createRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(target.startContainer, target.startOffset);
  const start = prefix.toString().length;
  prefix.setEnd(target.endContainer, target.endOffset);
  const end = prefix.toString().length;
  const delta = replacement.length - (end - start);
  const adjust = (offset: number) => offset <= start ? offset
    : offset >= end ? offset + delta : start + replacement.length;
  // If the writer explicitly selected the passage being replaced, finish at
  // its replacement. Unrelated selections (including backwards ones) survive.
  const overlaps = offsets.start < end && offsets.end > start;
  const position = overlaps
    ? { start: start + replacement.length, end: start + replacement.length }
    : { start: adjust(offsets.start), end: adjust(offsets.end) };

  return () => {
    // Surviving DOM points distinguish empty paragraphs and boundaries outside
    // inline formatting. Offsets repair points in text nodes the browser split,
    // replaced or shortened, without flattening those unaffected boundaries.
    if (bookmark?.restore()) {
      const restored = getCaretOffsets(root);
      if (restored?.start === position.start && restored.end === position.end) return true;
    }
    if (!setCaretOffsets(root, position)) return false;
    if (backwards && position.start !== position.end && selection.setBaseAndExtent) {
      const range = selection.getRangeAt(0);
      selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
    }
    return true;
  };
}
