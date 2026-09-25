// Inline ancestors are not included by Range.cloneContents when the entire
// selection sits inside one text node. Keep their explicit styles when moving
// a word, without carrying the manuscript's surrounding layout into the paste.
const inlineTags = new Set(['A', 'ABBR', 'B', 'BDI', 'BDO', 'CITE', 'CODE', 'DEL', 'EM',
  'FONT', 'I', 'INS', 'KBD', 'MARK', 'Q', 'S', 'SAMP', 'SMALL', 'SPAN', 'STRIKE',
  'STRONG', 'SUB', 'SUP', 'U', 'VAR']);

export function serializeEditorSelection(selection: Selection, root: HTMLElement, suppliedRanges?: Range[]) {
  const ranges = suppliedRanges ?? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i));
  if (!ranges.length || ranges.some(range => !root.contains(range.startContainer) || !root.contains(range.endContainer))) return null;
  const container = root.ownerDocument.createElement('div');
  for (const range of ranges) {
    let fragment: Node = range.cloneContents();
    let ancestor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer as Element : range.commonAncestorContainer.parentElement;
    while (ancestor && ancestor !== root && root.contains(ancestor)) {
      if (inlineTags.has(ancestor.tagName)) {
        const wrapper = ancestor.cloneNode(false);
        wrapper.appendChild(fragment);
        fragment = wrapper;
      }
      ancestor = ancestor.parentElement;
    }
    container.appendChild(fragment);
  }
  return { html: container.innerHTML, text: selection.toString() };
}
