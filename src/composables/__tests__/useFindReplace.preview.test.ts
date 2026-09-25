import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useFindReplace } from '../useFindReplace';

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.innerHTML = ''; });
describe('contextual search', () => {
  it('keeps the same match when refreshing and reports its real chapter and inline context', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h2>The harbor</h2><p>Mara met Ce<em>lia</em> by the library.</p><h2>The letter</h2><p>Celia wrote back.</p>';
    document.body.appendChild(root);
    const { handleFind, clearPendingHighlight } = useFindReplace({ editorContent: ref(root), captureSnapshot: vi.fn() });
    const original = root.innerHTML;
    const first = handleFind({ findText: 'Celia', direction: 'current', preview: true });
    expect(first.passage).toEqual({ before: 'Mara met ', match: 'Celia', after: ' by the library.', heading: 'The harbor' });
    expect(first.range?.toString()).toBe('Celia');
    expect(handleFind({ findText: 'Celia', direction: 'next', preview: true }).current).toBe(2);
    const refreshed = handleFind({ findText: 'Celia', direction: 'current', preview: true, selectMatch: false });
    expect(refreshed.current).toBe(2);
    expect(refreshed.passage?.heading).toBe('The letter');
    expect(root.innerHTML).toBe(original);
    clearPendingHighlight();
  });
});
