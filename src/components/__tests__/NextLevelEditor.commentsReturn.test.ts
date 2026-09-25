import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.stubGlobal('innerWidth', 800); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; window.getSelection()?.removeAllRanges(); vi.unstubAllGlobals(); });

describe('consistent return to writing from comments', () => {
  for (const method of ['close', 'toggle']) {
    for (const backwards of [false, true]) it(`${method} restores the ${backwards ? 'backward selection' : 'caret'} without editing`, async () => {
      const html = '<p>The bus waited.</p>';
      wrapper = mount(NextLevelEditor, { props: { modelValue: html, writingMode: true, enableComments: true }, attachTo: document.body });
      await nextTick();
      const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
      root.focus();
      const text = root.firstChild!.firstChild!;
      window.getSelection()!.setBaseAndExtent(text, 15, text, backwards ? 8 : 15);
      document.dispatchEvent(new Event('selectionchange'));
      const toggle = wrapper.findAll<HTMLButtonElement>('.writing-footer-actions button').find(button => button.text() === 'Comments')!;
      toggle.element.focus();
      await toggle.trigger('click');
      await nextTick();
      if (method === 'close') await wrapper.get('[aria-label="Close comments sidebar"]').trigger('click');
      else { toggle.element.focus(); await toggle.trigger('click'); }
      await nextTick();
      expect(wrapper.get('.comments-sidebar-content').attributes('aria-hidden')).toBe('true');
      expect(document.activeElement).toBe(root);
      expect(window.getSelection()!.anchorNode).toBe(text);
      expect(window.getSelection()!.anchorOffset).toBe(15);
      expect(window.getSelection()!.focusOffset).toBe(backwards ? 8 : 15);
      expect(root.innerHTML).toBe(html);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  }

  for (const readonly of [false, true]) it(`does not add an empty paragraph when closing ${readonly ? 'read-only' : 'editable'} comments`, async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '', writingMode: true, enableComments: true, readonly }, attachTo: document.body });
    await nextTick();
    const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
    const before = root.innerHTML;
    await wrapper.findAll('.writing-footer-actions button').find(button => button.text() === 'Comments')!.trigger('click');
    await wrapper.get('[aria-label="Close comments sidebar"]').trigger('click');
    await nextTick();
    expect(root.innerHTML).toBe(before);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
