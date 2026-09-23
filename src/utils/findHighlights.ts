const MATCHES = 'nle-find-matches';
const CURRENT = 'nle-find-current';
type OwnedRanges = { matches: Range[]; current: Range };
type RegistryState = { owners: Map<symbol, OwnedRanges>; matches?: Highlight; current?: Highlight };
const documents = new WeakMap<Document, RegistryState>();

/** Search decoration must never enter HTML, undo history, autosave, or exports.
 * CSS Highlights paint live ranges without inserting wrappers into the prose.
 * Each editor owns its ranges; clearing one leaves other editors' finds intact.
 * Older browsers retain the contextual result and normal selection fallback. */
export function createFindHighlights() {
  const owner = Symbol('editor-find');
  let document: Document | undefined;
  const render = (doc: Document, state: RegistryState) => {
    const view = doc.defaultView as (Window & typeof globalThis) | null;
    const registry = view?.CSS?.highlights;
    if (!registry || !view?.Highlight) return;
    if (!state.owners.size) {
      if (registry.get(MATCHES) === state.matches) registry.delete(MATCHES);
      if (registry.get(CURRENT) === state.current) registry.delete(CURRENT);
      documents.delete(doc);
      return;
    }
    const matches = new view.Highlight();
    const current = new view.Highlight();
    current.priority = 1;
    for (const ranges of state.owners.values()) {
      for (const range of ranges.matches) matches.add(range);
      current.add(ranges.current);
    }
    registry.set(MATCHES, matches);
    registry.set(CURRENT, current);
    state.matches = matches;
    state.current = current;
  };
  const clear = () => {
    if (!document) return;
    const state = documents.get(document);
    if (state) { state.owners.delete(owner); render(document, state); }
    document = undefined;
  };
  const update = (root: HTMLElement, matches: Range[], index: number) => {
    if (document !== root.ownerDocument) clear();
    document = root.ownerDocument;
    const view = document.defaultView as (Window & typeof globalThis) | null;
    if (!view?.CSS?.highlights || !view?.Highlight || !matches[index]) { clear(); return; }
    const state = documents.get(document) ?? { owners: new Map<symbol, OwnedRanges>() };
    documents.set(document, state);
    state.owners.set(owner, { matches, current: matches[index] });
    render(document, state);
  };
  return { update, clear };
}
