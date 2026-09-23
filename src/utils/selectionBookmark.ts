/** Preserve DOM selection points while block wrappers are replaced or moved.
 * Unlike a live Range, these references do not move to the parent when a text
 * node is reparented. Neighbour references also preserve empty-block positions
 * and boundaries outside inline marks without flattening the document to text.
 */
export type RememberReplacement = (before: Node, after: Node | Node[]) => void;

export function captureSelectionBookmark(root: HTMLElement) {
  const selection = root.ownerDocument.defaultView?.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const point = (node: Node, offset: number) => ({
    node, offset,
    next: node.childNodes[offset] ?? null,
    previous: node.childNodes[offset - 1] ?? null,
    childCount: node.childNodes.length,
  });
  const start = point(range.startContainer, range.startOffset);
  const end = point(range.endContainer, range.endOffset);
  const backwards = !range.collapsed && selection.anchorNode === range.endContainer
    && selection.anchorOffset === range.endOffset;
  const replacements = new Map<Node, Node[]>();
  const remember: RememberReplacement = (before, after) => {
    replacements.set(before, Array.isArray(after) ? after : [after]);
  };
  const replacement = (node: Node | null, last = false): Node | null => {
    if (!node) return null;
    const nodes = replacements.get(node);
    const next = nodes ? (last ? nodes.at(-1) : nodes[0]) ?? null : node;
    return next && next !== node ? replacement(next, last) : next;
  };
  const resolve = (saved: ReturnType<typeof point>) => {
    const node = replacement(saved.node);
    if (node?.nodeType === Node.TEXT_NODE && root.contains(node)) {
      return { node, offset: Math.min(saved.offset, node.textContent?.length ?? 0) };
    }
    const next = replacement(saved.next);
    const previous = replacement(saved.previous, true);
    const beside = (child: Node | null, after: boolean) => {
      if (!child?.parentNode || !root.contains(child)) return null;
      return { node: child.parentNode, offset: Array.prototype.indexOf.call(child.parentNode.childNodes, child) + Number(after) };
    };
    // A lifted sub-list no longer belongs to its converted paragraph. Prefer
    // the boundary that still belongs inside that paragraph when possible.
    if (node && next?.parentNode === node) return beside(next, false);
    if (node && previous?.parentNode === node) return beside(previous, true);
    const neighbour = beside(next, false) ?? beside(previous, true);
    if (neighbour) return neighbour;
    if (node && root.contains(node)) {
      // A newly inserted first block owns its initial caret; the old empty
      // editor boundary must not pull it back outside that block.
      if (node === root && saved.childCount === 0 && root.childNodes.length > 0) return null;
      return { node, offset: Math.min(saved.offset, node.childNodes.length) };
    }
    return null;
  };

  const restore = () => {
    const from = resolve(start);
    const to = resolve(end);
    if (!from || !to) return false;
    if (typeof selection.setBaseAndExtent === 'function') {
      const [anchor, focus] = backwards ? [to, from] : [from, to];
      selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
    } else {
      const restored = root.ownerDocument.createRange();
      restored.setStart(from.node, from.offset);
      restored.setEnd(to.node, to.offset);
      selection.removeAllRanges();
      selection.addRange(restored);
    }
    return true;
  };
  return { remember, restore };
}
