// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getTextStatistics } from '../commands';

describe('manuscript text statistics', () => {
  it('keeps words across inline marks and separates nested blocks, breaks and table cells', () => {
    const html = '<h1>A title</h1><div><p>un<em>believ</em>able<br>weather</p><ul><li>First</li><li>Second</li></ul></div><table><tr><td>Left</td><td>Right</td></tr></table>';
    const text = 'A title unbelievable weather First Second Left Right';
    expect(getTextStatistics(html)).toEqual({ wordCount: 8, characterCount: text.length });
  });

  it('excludes document chrome and executable/style text while decoding prose entities', () => {
    const html = '<script>one two</script><style>body{color:red}</style><svg><style>svg hidden text</style></svg><nav class="table-of-contents"><p>Copied heading</p></nav><div class="page-break">Page break</div><!-- comment --><p>Ol&aacute; &amp; caf&eacute;&nbsp;again</p>';
    expect(getTextStatistics(html)).toEqual({ wordCount: 4, characterCount: 'Olá & café again'.length });
    expect(getTextStatistics('<p> \n<br> </p>')).toEqual({ wordCount: 0, characterCount: 0 });
  });

  it('counts every paragraph in a book without merging adjacent words', () => {
    const paragraph = '<p>The <strong>brass key</strong> was warm.</p>';
    expect(getTextStatistics(paragraph.repeat(1000))).toEqual({
      wordCount: 5000,
      characterCount: 'The brass key was warm. '.repeat(1000).trim().length,
    });
  });

  it('does not count empty formatting markers as authored words or characters', () => {
    expect(getTextStatistics('<p>Keep this <strong>\u200b</strong><strong></strong></p>'))
      .toEqual({ wordCount: 2, characterCount: 'Keep this'.length });
    expect(getTextStatistics('<p><em>\u200b</em></p>'))
      .toEqual({ wordCount: 0, characterCount: 0 });
    expect(getTextStatistics('<p>un<strong>\u200bbeliev</strong>able</p>'))
      .toEqual({ wordCount: 1, characterCount: 'unbelievable'.length });
  });

  it('preserves joiners used by prose and emoji when ignoring caret markers', () => {
    const text = 'می\u200cروم 👩\u200d💻';
    expect(getTextStatistics('<p>' + text + '</p>'))
      .toEqual({ wordCount: 2, characterCount: text.length });
  });

  it('can count the live document without disturbing its selected text or formatting nodes', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<p>un<em>believ</em>able weather</p>';
    document.body.append(editor);
    const emphasis = editor.querySelector('em')!;
    const range = document.createRange();
    range.selectNodeContents(emphasis);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      expect(getTextStatistics(editor.innerHTML, editor)).toEqual({ wordCount: 2, characterCount: 20 });
      expect(editor.querySelector('em')).toBe(emphasis);
      expect(selection.toString()).toBe('believ');
      expect(selection.getRangeAt(0).startContainer).toBe(emphasis);
    } finally {
      selection.removeAllRanges();
      editor.remove();
    }
  });
});
