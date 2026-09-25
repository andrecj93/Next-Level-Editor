import { describe, expect, it } from 'vitest';
import { useEditorHistory } from '../useEditorHistory';

describe('history labels during manuscript typing', () => {
  it('separates the title and prose in the initial version preview', () => {
    const history = useEditorHistory();
    history.captureSnapshot('<h1>The book</h1><p>The opening.</p>');
    expect(history.history.value[0].preview).toBe('The book The opening.');
  });
  it('shows the passage at the editing position instead of a repeated book title', () => {
    const history = useEditorHistory();
    const opening = 'The Cartographer of Quiet Places. '.repeat(100);
    const text = opening + 'She opened the letter again. This time, she knew what to say.';
    history.captureSnapshot(`<p>${text}</p>`, { start: text.length, end: text.length }, 'typing', text);
    expect(history.history.value[0].preview).toContain('letter again');
    expect(history.history.value[0].preview).not.toContain('Cartographer');
    expect(history.history.value[0].preview).toMatch(/^… \S/);
    expect(history.history.value[0].html).toBe(`<p>${text}</p>`);
  });

  it('starts a preview on a whole word, including joined emoji', () => {
    const history = useEditorHistory();
    const text = 'Earlier words. ' + '👩‍💻 ' + 'a'.repeat(43);
    history.captureSnapshot(`<p>${text}</p>`, { start: text.length, end: text.length }, undefined, text);
    expect(history.history.value[0].preview).toContain('👩‍💻');
    expect(history.history.value[0].preview).not.toContain('\uFFFD');
  });
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
