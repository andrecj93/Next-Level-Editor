import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';
import WritingCompanion from '../WritingCompanion.vue';

const documentHtml = '<p>She returned in order to find the house.</p>';
const keptChoice = JSON.stringify(['0:' + JSON.stringify(['She returned in order to find the house.', 13, 'in order to', 'A little more direct'])]);

describe('NextLevelEditor writing decision persistence', () => {
  let wrapper: VueWrapper | undefined;
  const mountEditor = async (keptWritingNotes = '[]', saveHandler = vi.fn(() => true)) => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: documentHtml, writingMode: true, keptWritingNotes, saveHandler }, attachTo: document.body });
    await nextTick();
    if (!wrapper.findComponent(WritingCompanion).exists()) {
      await wrapper.find('[aria-label="Writing companion"]').trigger('click');
    }
    return saveHandler;
  };
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('saves a keep-only choice without changing prose or adding an undo step', async () => {
    const save = await mountEditor();
    const editor = wrapper!.find('.editor-content');
    const before = editor.element.innerHTML;
    await wrapper!.find('[aria-label="Dismiss note: A little more direct"]').trigger('click');
    expect(wrapper!.emitted('update:keptWritingNotes')?.at(-1)?.[0]).toBe(keptChoice);
    expect(editor.element.innerHTML).toBe(before);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper!.find('.auto-save-indicator').text()).toContain('Unsaved changes');
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenLastCalledWith(before);
    expect(wrapper!.find('.auto-save-indicator').text()).toContain('Saved');
    await editor.trigger('keydown', { key: 'z', ctrlKey: true });
    expect(editor.element.innerHTML).toBe(before);
  });

  it('hydrates a recovered choice without emitting or initiating another save', async () => {
    const save = await mountEditor(keptChoice);
    expect(wrapper!.findComponent(WritingCompanion).text()).toContain('You’ve considered every note. Keep your voice.');
    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper!.emitted('update:keptWritingNotes')).toBeUndefined();
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(save).not.toHaveBeenCalled();
  });

  it('does not reopen the companion just to repeat that every note was kept', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: documentHtml, writingMode: true, keptWritingNotes: keptChoice }, attachTo: document.body });
    await nextTick();
    expect(wrapper.findComponent(WritingCompanion).exists()).toBe(false);
    await wrapper.find('[aria-label="Writing companion"]').trigger('click');
    expect(wrapper.findComponent(WritingCompanion).text()).toContain('You’ve considered every note.');
  });

  it('keeps the decision after a failed save and includes it when Retry succeeds', async () => {
    const save = vi.fn(() => false);
    await mountEditor('[]', save);
    await wrapper!.find('[aria-label="Dismiss note: A little more direct"]').trigger('click');
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(wrapper!.find('.auto-save-indicator').text()).toContain("Couldn't save changes");
    expect(wrapper!.findComponent(WritingCompanion).text()).toContain('You’ve considered every note.');
    save.mockReturnValue(true);
    await wrapper!.find('.save-retry').trigger('click');
    await flushPromises();
    expect(wrapper!.find('.auto-save-indicator').text()).toContain('Saved');
    expect(wrapper!.emitted('update:keptWritingNotes')?.at(-1)?.[0]).toBe(keptChoice);
  });

  it('ignores invalid host metadata and accepts an explicit reset without resaving', async () => {
    const save = await mountEditor(keptChoice);
    await wrapper!.setProps({ keptWritingNotes: '["broken"]' });
    expect(wrapper!.findComponent(WritingCompanion).text()).toContain('You’ve considered every note.');
    await wrapper!.setProps({ keptWritingNotes: '[]' });
    expect(wrapper!.find('[aria-label="Dismiss note: A little more direct"]').exists()).toBe(true);
    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(save).not.toHaveBeenCalled();
  });

  it('lets the writer revisit a saved choice with focus on the restored passage', async () => {
    const save = await mountEditor(keptChoice);
    const editor = wrapper!.find('.editor-content');
    const before = editor.element.innerHTML;
    await wrapper!.find('.review-kept').trigger('click');
    await nextTick();
    expect(wrapper!.find('.review-kept').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper!.find('.note-passage').element);
    expect(wrapper!.emitted('update:keptWritingNotes')?.at(-1)?.[0]).toBe('[]');
    expect(editor.element.innerHTML).toBe(before);
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(save).toHaveBeenCalledOnce();
  });
});
