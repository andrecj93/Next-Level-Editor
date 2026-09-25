import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';
import { reviewWriting, type WritingNote } from '../../utils/writingReview';

describe('writing note application guards', () => {
  let wrapper: VueWrapper | undefined;
  const html = '<p>She opened the window in order to hear the town.</p>';
  const originalCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.restoreAllMocks();
    if (originalCommand) Object.defineProperty(document, 'execCommand', originalCommand);
    else Reflect.deleteProperty(document, 'execCommand');
    vi.useRealTimers();
    document.body.innerHTML = '';
  });
  const prepare = async (readonly = false) => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: html, writingMode: true, readonly }, attachTo: document.body });
    await nextTick();
    const root = wrapper.find('.editor-content').element as HTMLElement;
    root.focus();
    window.getSelection()!.collapse(root.firstChild!.firstChild, 48);
    return root;
  };
  const apply = (note = reviewWriting(html).notes[0]) =>
    (wrapper!.vm as unknown as { applyWritingNote: (note: WritingNote) => void }).applyWritingNote(note);

  it('leaves a read-only manuscript unchanged', async () => {
    const root = await prepare(true);
    const command = vi.spyOn(document, 'execCommand');
    apply();
    expect(command).not.toHaveBeenCalled();
    expect(root.innerHTML).toBe(html);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });

  it('refreshes a stale note without editing another passage', async () => {
    const root = await prepare();
    const command = vi.spyOn(document, 'execCommand');
    apply({ ...reviewWriting(html).notes[0], blockText: 'An earlier draft.' });
    expect(command).not.toHaveBeenCalled();
    expect(root.innerHTML).toBe(html);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });

  it('leaves a failed replacement selected for manual editing without claiming success', async () => {
    const root = await prepare();
    vi.spyOn(document, 'execCommand').mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    apply();
    expect(root.innerHTML).toBe(html);
    expect(window.getSelection()!.toString()).toBe('in order to');
    expect(warn).toHaveBeenCalledWith('[NextLevelEditor] Writing suggestion could not be applied', { kind: 'A little more direct' });
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });
});
