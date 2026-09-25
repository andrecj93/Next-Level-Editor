import { afterEach, describe, expect, it } from 'vitest';
import { preserveSelectionAfterTextReplacement } from '../selectionAfterReplacement';
import { getCaretOffsets } from '../caretOffset';

describe('writing position after accepting a replacement', () => {
  let root: HTMLElement;
  afterEach(() => { root?.remove(); window.getSelection()?.removeAllRanges(); });
  const prepare = (html = '<p>She opened the window in order to hear the town.</p>') => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    root.innerHTML = html;
    document.body.appendChild(root);
    const text = root.querySelector('p')!.firstChild!;
    const start = text.textContent!.indexOf('in order to');
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + 11);
    return { text, range };
  };
  const replace = (range: Range, value = 'to') => {
    const restore = preserveSelectionAfterTextReplacement(root, range, value)!;
    range.deleteContents();
    range.insertNode(document.createTextNode(value));
    // Browsers may split or merge the original text nodes during insertText.
    root.normalize();
    expect(restore()).toBe(true);
  };

  it.each([
    [0, 0], [4, 4], [22, 22], [25, 24], [33, 24], [38, 29], [48, 39],
  ])('keeps caret %i at its corresponding position %i', (before, after) => {
    const { text, range } = prepare();
    window.getSelection()!.collapse(text, before);
    replace(range);
    expect(getCaretOffsets(root)).toEqual({ start: after, end: after });
  });

  it('preserves a backwards selection following the replacement', () => {
    const { text, range } = prepare();
    window.getSelection()!.setBaseAndExtent(text, 47, text, 43);
    replace(range);
    const selection = window.getSelection()!;
    expect(selection.toString()).toBe('town');
    expect(selection.anchorOffset).toBe(38);
    expect(selection.focusOffset).toBe(34);
  });

  it('finishes at the replacement when the writer selected its passage', () => {
    const { range } = prepare();
    window.getSelection()!.addRange(range.cloneRange());
    replace(range);
    expect(getCaretOffsets(root)).toEqual({ start: 24, end: 24 });
    expect(window.getSelection()!.isCollapsed).toBe(true);
  });

  it('keeps an empty paragraph distinct from the preceding text', () => {
    const { range } = prepare('<p>She came in order to help.</p><p><br></p>');
    const paragraph = root.lastElementChild!;
    window.getSelection()!.collapse(paragraph, 0);
    replace(range);
    expect(window.getSelection()!.anchorNode).toBe(paragraph);
    expect(window.getSelection()!.anchorOffset).toBe(0);
  });

  it('preserves the boundary outside an emphasized word', () => {
    const { range } = prepare('<p>She came in order to help.</p><p><em>Quiet.</em></p>');
    const paragraph = root.lastElementChild!;
    window.getSelection()!.collapse(paragraph, 1);
    replace(range);
    expect(window.getSelection()!.anchorNode).toBe(paragraph);
    expect(window.getSelection()!.anchorOffset).toBe(1);
  });

  it('preserves a boundary beside a noneditable widget', () => {
    const { range } = prepare('<p>She came in order to help.</p><p><span contenteditable="false">Name</span></p>');
    const paragraph = root.lastElementChild!;
    window.getSelection()!.collapse(paragraph, 0);
    replace(range);
    expect(window.getSelection()!.anchorNode).toBe(paragraph);
    expect(window.getSelection()!.anchorOffset).toBe(0);
  });

  it('also adjusts a caret when a replacement is longer', () => {
    const { text, range } = prepare();
    window.getSelection()!.collapse(text, text.textContent!.length);
    replace(range, 'with the intention to');
    expect(getCaretOffsets(root)?.start).toBe(root.textContent!.length);
  });

  it('refuses selections and targets outside this editor', () => {
    const { range } = prepare();
    window.getSelection()!.collapse(document.body, 0);
    expect(preserveSelectionAfterTextReplacement(root, range, 'to')).toBeNull();
    window.getSelection()!.collapse(root, 0);
    range.selectNodeContents(document.body);
    expect(preserveSelectionAfterTextReplacement(root, range, 'to')).toBeNull();
  });
});
