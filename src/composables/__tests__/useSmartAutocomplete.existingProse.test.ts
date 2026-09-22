import { afterEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useSmartAutocomplete } from '../useSmartAutocomplete';

function editorAt(text: string, offset = text.length) {
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  editor.append(paragraph);
  document.body.append(editor);
  const range = document.createRange();
  range.setStart(paragraph.firstChild!, offset);
  range.collapse(true);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  return { editor, ...useSmartAutocomplete(ref(editor)) };
}

afterEach(() => { document.body.innerHTML = ''; window.getSelection()?.removeAllRanges(); });

describe('live markdown shortcuts in existing prose', () => {
  it.each(['1. An existing numbered paragraph!', '# An existing literal heading!', '- An existing dash paragraph!'])('does not turn an existing paragraph into a new block: %s', text => {
    const { editor, handleInput } = editorAt(text);
    handleInput(new InputEvent('input', { inputType: 'insertText', data: '!' }));
    expect(editor.innerHTML).toBe(`<p>${text}</p>`);
  });

  it('does not split a numbered paragraph when a writer edits its middle', () => {
    const text = '1. A paragraph with more text after the caret.';
    const { editor, handleInput } = editorAt(text, '1. A paragraph '.length);
    handleInput(new InputEvent('input', { inputType: 'insertText', data: ' ' }));
    expect(editor.innerHTML).toBe(`<p>${text}</p>`);
  });

  it('still creates a new heading as its first character is typed', () => {
    const { editor, handleInput } = editorAt('# H');
    handleInput(new InputEvent('input', { inputType: 'insertText', data: 'H' }));
    expect(editor.innerHTML).toBe('<h1>H</h1>');
  });

  it('keeps inline markdown available inside an existing numbered paragraph', () => {
    const { editor, handleInput } = editorAt('1. Keep this **word**');
    handleInput(new InputEvent('input', { inputType: 'insertText', data: '*' }));
    expect(editor.innerHTML).toBe('<p>1. Keep this <strong>word</strong></p>');
  });

  it('does not reinterpret a prefix exposed by deletion', () => {
    const { editor, handleInput } = editorAt('1. An observation');
    handleInput(new InputEvent('input', { inputType: 'deleteContentBackward' }));
    expect(editor.querySelector('ol')).toBeNull();
  });
});
