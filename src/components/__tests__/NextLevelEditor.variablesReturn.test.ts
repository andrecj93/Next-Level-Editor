import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.stubGlobal('innerWidth', 800); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; window.getSelection()?.removeAllRanges(); vi.unstubAllGlobals(); });

describe('return to writing from template variables', () => {
  for (const method of ['close', 'escape', 'toggle']) {
    for (const backwards of [false, true]) it(`${method} restores the ${backwards ? 'backward selection' : 'caret'} without editing`, async () => {
      const html = '<p>The bus waited.</p>';
      wrapper = mount(NextLevelEditor, { props: { modelValue: html, writingMode: true, enableVariables: true }, attachTo: document.body });
      await nextTick();
      const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
      root.focus();
      const text = root.firstChild!.firstChild!;
      window.getSelection()!.setBaseAndExtent(text, 15, text, backwards ? 8 : 15);
      document.dispatchEvent(new Event('selectionchange'));
      const toggle = wrapper.findAll<HTMLButtonElement>('.writing-footer-actions button').find(button => button.text() === 'Variables')!;
      toggle.element.focus();
      await toggle.trigger('click');
      const close = wrapper.get<HTMLButtonElement>('[aria-label="Close variables panel"]');
      close.element.focus();
      if (method === 'close') await close.trigger('click');
      else if (method === 'escape') await close.trigger('keydown', { key: 'Escape' });
      else await toggle.trigger('click');
      await nextTick();
      expect(wrapper.find('.variables-panel').exists()).toBe(false);
      expect(document.activeElement).toBe(root);
      expect(window.getSelection()!.anchorNode).toBe(text);
      expect(window.getSelection()!.anchorOffset).toBe(15);
      expect(window.getSelection()!.focusOffset).toBe(backwards ? 8 : 15);
      expect(root.innerHTML).toBe(html);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  }

  it('makes the panel reachable by keyboard without changing an empty document', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '', writingMode: true, enableVariables: true }, attachTo: document.body });
    await nextTick();
    const root = wrapper.get('[aria-label="Rich text editor"]').element as HTMLElement;
    const before = root.innerHTML;
    await wrapper.findAll('.writing-footer-actions button').find(button => button.text() === 'Variables')!.trigger('click');
    const close = wrapper.get<HTMLButtonElement>('[aria-label="Close variables panel"]');
    expect(document.activeElement).toBe(close.element);
    await close.trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(root);
    expect(root.innerHTML).toBe(before);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
