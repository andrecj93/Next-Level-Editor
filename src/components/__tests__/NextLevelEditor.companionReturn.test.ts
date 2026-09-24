import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.stubGlobal('innerWidth', 800); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; window.getSelection()?.removeAllRanges(); vi.unstubAllGlobals(); });

describe('return to writing after closing the companion', () => {
  for (const method of ['close', 'escape', 'toggle']) {
    for (const backwards of [false, true]) it(`${method} restores the ${backwards ? 'backward selection' : 'caret'} without editing`, async () => {
      const html = '<p>She returned in order to find the house.</p><p>The bus waited.</p>';
      wrapper = mount(NextLevelEditor, { props: { modelValue: html, writingMode: true }, attachTo: document.body });
      await nextTick();
      const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
      root.focus();
      const text = root.lastChild!.firstChild!;
      window.getSelection()!.setBaseAndExtent(text, 15, text, backwards ? 8 : 15);
      document.dispatchEvent(new Event('selectionchange'));
      const toggle = wrapper.get<HTMLButtonElement>('.writing-footer-actions button');
      toggle.element.focus();
      await toggle.trigger('click');
      await nextTick();
      const panel = wrapper.get('.writing-companion');
      if (method === 'close') await panel.get('[aria-label="Close writing companion"]').trigger('click');
      else if (method === 'escape') await panel.trigger('keydown', { key: 'Escape' });
      else await toggle.trigger('click');
      await nextTick();
      expect(wrapper.find('.writing-companion').exists()).toBe(false);
      expect(document.activeElement).toBe(root);
      expect(window.getSelection()!.anchorNode).toBe(text);
      expect(window.getSelection()!.anchorOffset).toBe(15);
      expect(window.getSelection()!.focusOffset).toBe(backwards ? 8 : 15);
      expect(root.innerHTML).toBe(html);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  }

  for (const readonly of [false, true]) it(`does not create content in an empty ${readonly ? 'read-only' : 'editable'} document`, async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '', writingMode: true, readonly }, attachTo: document.body });
    await nextTick();
    const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
    const before = root.innerHTML;
    await wrapper.get('.writing-footer-actions button').trigger('click');
    await wrapper.get('[aria-label="Close writing companion"]').trigger('click');
    await nextTick();
    expect(root.innerHTML).toBe(before);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
