import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';
import { getCaretOffsets } from '../../utils/caretOffset';

let wrapper: VueWrapper | null = null;
const baseline = '<p>First paragraph.</p><p>Last line.</p>';
afterEach(() => { wrapper?.unmount(); wrapper = null; window.getSelection()?.removeAllRanges(); });

async function setup(mode: 'editor' | 'split' = 'editor') {
  wrapper = mount(NextLevelEditor, { props: { modelValue: baseline, defaultViewMode: mode }, attachTo: document.body });
  await nextTick();
  if (mode === 'split') await wrapper.findAll('.split-toggle-btn')[1].trigger('click');
  await nextTick();
  return wrapper.find('[role="textbox"][aria-label="Rich text editor"]').element as HTMLElement;
}
function caret(root: HTMLElement, paragraph: number, offset: number) {
  const text = root.querySelectorAll('p')[paragraph].firstChild!;
  window.getSelection()!.setBaseAndExtent(text, offset, text, offset);
}
function insert(root: HTMLElement, value: string) {
  root.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
  const selection = window.getSelection()!;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(value);
  range.insertNode(node);
  selection.collapse(node, value.length);
  root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}
async function undo() { (wrapper!.vm as unknown as { undo: () => void }).undo(); await nextTick(); }

describe('history captures the writing position before an edit', () => {
  for (const mode of ['editor', 'split'] as const) {
    it(`restores the first typed edit at the end of a loaded ${mode} document`, async () => {
      const root = await setup(mode);
      caret(root, 1, 10);
      insert(root, 'x');
      await undo();
      expect(root.innerHTML).toBe(baseline);
      expect(getCaretOffsets(root)).toEqual({ start: 26, end: 26 });
    });

    it(`keeps IME candidates out of history and restores the starting ${mode} caret`, async () => {
      const root = await setup(mode);
      caret(root, 1, 10);
      const before = wrapper!.emitted('update:modelValue')?.length ?? 0;
      root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      const text = root.querySelectorAll('p')[1].firstChild as Text;
      text.appendData('日');
      window.getSelection()!.collapse(text, text.length);
      root.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
      root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
      expect(wrapper!.emitted('update:modelValue')?.length ?? 0).toBe(before);
      text.appendData('本語');
      window.getSelection()!.collapse(text, text.length);
      root.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '日本語' }));
      await undo();
      expect(root.innerHTML).toBe(baseline);
      expect(getCaretOffsets(root)).toEqual({ start: 26, end: 26 });
    });
  }

  it('preserves a backwards selection when undoing a replacement', async () => {
    const root = await setup();
    const text = root.querySelectorAll('p')[1].firstChild!;
    window.getSelection()!.setBaseAndExtent(text, 9, text, 5);
    insert(root, 'word');
    await undo();
    expect(root.innerHTML).toBe(baseline);
    expect(window.getSelection()!.toString()).toBe('line');
    expect(window.getSelection()!.anchorOffset).toBe(9);
    expect(window.getSelection()!.focusOffset).toBe(5);
  });

  it('keeps a continuous typed word in one undo step', async () => {
    const root = await setup();
    caret(root, 1, 10);
    for (const letter of 'hello') insert(root, letter);
    await undo();
    expect(root.innerHTML).toBe(baseline);
    expect(getCaretOffsets(root)).toEqual({ start: 26, end: 26 });
  });

  it('starts a new step after moving the caret within a typing burst', async () => {
    const root = await setup();
    caret(root, 1, 10);
    insert(root, 'word');
    caret(root, 0, 0);
    insert(root, 'New ');
    await undo();
    expect(root.textContent).toBe('First paragraph.Last line.word');
    expect(getCaretOffsets(root)).toEqual({ start: 0, end: 0 });
    await undo();
    expect(root.innerHTML).toBe(baseline);
    expect(getCaretOffsets(root)).toEqual({ start: 26, end: 26 });
  });

  for (const software of [false, true]) it(`restores the caret after a ${software ? 'software' : 'hardware'} paragraph split`, async () => {
    const root = await setup();
    root.focus();
    caret(root, 1, 5);
    root.dispatchEvent(software
      ? new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertParagraph' })
      : new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));
    await nextTick();
    expect(root.querySelectorAll('p')).toHaveLength(3);
    await undo();
    expect(root.innerHTML).toBe(baseline);
    expect(getCaretOffsets(root)).toEqual({ start: 21, end: 21 });
  });
});
