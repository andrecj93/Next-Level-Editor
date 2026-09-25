import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => { wrapper?.unmount(); window.getSelection()?.removeAllRanges(); });

describe('writing statistics focus', () => {
  for (const method of ['close', 'escape', 'toggle']) {
    for (const backwards of [false, true]) it(`${method} returns the ${backwards ? 'backward selection' : 'caret'}`, async () => {
      const html = '<p>The bus waited.</p>';
      wrapper = mount(NextLevelEditor, { props: { modelValue: html, showWritingStats: true }, attachTo: document.body });
      await nextTick();
      const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
      root.focus();
      const text = root.firstChild!.firstChild!;
      window.getSelection()!.setBaseAndExtent(text, 14, text, backwards ? 8 : 14);
      document.dispatchEvent(new Event('selectionchange'));
      const toggle = wrapper.get<HTMLButtonElement>('.writing-stats-toggle-fab');
      toggle.element.focus();
      await toggle.trigger('click');
      const close = wrapper.get<HTMLButtonElement>('[aria-label="Close writing statistics"]');
      expect(document.activeElement).toBe(close.element);
      if (method === 'close') await close.trigger('click');
      else if (method === 'escape') await close.trigger('keydown', { key: 'Escape' });
      else await toggle.trigger('click');
      await nextTick();
      expect(wrapper.find('.writing-stats-panel').exists()).toBe(false);
      expect(document.activeElement).toBe(root);
      expect(window.getSelection()!.anchorNode).toBe(text);
      expect(window.getSelection()!.anchorOffset).toBe(14);
      expect(window.getSelection()!.focusOffset).toBe(backwards ? 8 : 14);
      expect(root.innerHTML).toBe(html);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  }
  for (const readonly of [false, true]) it(`returns to an empty ${readonly ? 'read-only' : 'editable'} document without creating prose`, async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '', showWritingStats: true, readonly }, attachTo: document.body });
    await nextTick();
    const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
    const before = root.innerHTML;
    await wrapper.get('.writing-stats-toggle-fab').trigger('click');
    await wrapper.get('[aria-label="Close writing statistics"]').trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(root);
    expect(root.innerHTML).toBe(before);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
