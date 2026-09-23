import { describe, expect, it } from 'vitest';
import { useEditorHistory } from '../useEditorHistory';

describe('history labels during manuscript typing', () => {
  it('keeps normalized labels and the full undo document when live text is supplied', () => {
    const history = useEditorHistory();
    const text = '  A room\n\tleft open.  ';
    const html = '<p>A room<br>left open.</p>';
    history.captureSnapshot(html, { start: 8, end: 8 }, 'typing', text);
    expect(history.history.value[0]).toMatchObject({ html, preview: 'A room left open.', selection: { start: 8, end: 8 } });
    history.captureSnapshot('<p>A door left open.</p>', { start: 9, end: 9 }, 'typing', 'A door left open.');
    expect(history.history.value).toHaveLength(1);
    expect(history.history.value[0].preview).toBe('A door left open.');
  });

  it('preserves the 60-character boundary and literal text without trimming the stored HTML', () => {
    const history = useEditorHistory();
    const sixty = 'a'.repeat(60);
    history.captureSnapshot(`<p>${sixty}   </p>`, null, undefined, `${sixty}   `);
    expect(history.history.value[0].preview).toBe(sixty);
    history.captureSnapshot('<p>Long document</p>', null, undefined, `${sixty} next${' paragraph'.repeat(1000)}`);
    expect(history.history.value[1].preview).toBe(`${'a'.repeat(57)}...`);
    history.captureSnapshot('<p>&lt;b&gt;literal&lt;/b&gt;</p>');
    expect(history.history.value[2].preview).toBe('<b>literal</b>');
  });
});
