import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';
import HistoryTimeline from '../HistoryTimeline.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => { wrapper?.unmount(); window.getSelection()?.removeAllRanges(); });

describe('history return to writing', () => {
  it('guards history restoration when the document becomes read-only', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '<p>First draft</p>' }, attachTo: document.body });
    await nextTick();
    await wrapper.setProps({ modelValue: '<p>Final draft</p>' });
    await nextTick();
    await wrapper.setProps({ readonly: true });
    (wrapper.vm as unknown as { showHistoryTimeline: boolean }).showHistoryTimeline = true;
    await nextTick();
    const before = wrapper.emitted('update:modelValue')?.length ?? 0;
    wrapper.getComponent(HistoryTimeline).vm.$emit('goToEntry', 0);
    await nextTick();
    expect(wrapper.get('[aria-label="Rich text editor"]').text()).toBe('Final draft');
    expect(wrapper.emitted('update:modelValue')?.length ?? 0).toBe(before);
  });
  for (const method of ['close', 'escape', 'toggle']) {
    for (const backwards of [false, true]) it(`${method} returns the ${backwards ? 'backward selection' : 'caret'}`, async () => {
      const html = '<p>The bus waited.</p>';
      wrapper = mount(NextLevelEditor, { props: { modelValue: html }, attachTo: document.body });
      await nextTick();
      const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
      root.focus();
      const text = root.firstChild!.firstChild!;
      window.getSelection()!.setBaseAndExtent(text, 14, text, backwards ? 8 : 14);
      document.dispatchEvent(new Event('selectionchange'));
      const state = wrapper.vm as unknown as { showHistoryTimeline: boolean };
      state.showHistoryTimeline = true;
      await nextTick();
      await nextTick();
      const close = wrapper.get<HTMLButtonElement>('[aria-label="Close history"]');
      expect(document.activeElement).toBe(close.element);
      if (method === 'close') await close.trigger('click');
      else if (method === 'escape') await close.trigger('keydown', { key: 'Escape' });
      else state.showHistoryTimeline = false;
      await nextTick();
      await nextTick();
      expect(wrapper.find('.history-timeline-panel').exists()).toBe(false);
      expect(document.activeElement).toBe(root);
      expect(window.getSelection()!.anchorNode).toBe(text);
      expect(window.getSelection()!.anchorOffset).toBe(14);
      expect(window.getSelection()!.focusOffset).toBe(backwards ? 8 : 14);
      expect(root.innerHTML).toBe(html);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  }
  for (const readonly of [false, true]) it(`returns to an empty ${readonly ? 'read-only' : 'editable'} document without creating prose`, async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '', readonly }, attachTo: document.body });
    await nextTick();
    const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
    const before = root.innerHTML;
    (wrapper.vm as unknown as { showHistoryTimeline: boolean }).showHistoryTimeline = true;
    await nextTick();
    await nextTick();
    await wrapper.get('[aria-label="Close history"]').trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(root);
    expect(root.innerHTML).toBe(before);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
