import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | null = null;
afterEach(() => { wrapper?.unmount(); wrapper = null; window.getSelection()?.removeAllRanges(); vi.useRealTimers(); });

describe('cross-paragraph Enter updates the complete document state', () => {
  for (const mode of ['editor', 'split'] as const) {
    for (const software of [false, true]) it(`records and saves ${software ? 'software' : 'hardware'} Enter in ${mode}`, async () => {
      vi.useFakeTimers();
      const original = '<p>Alpha beta.</p><p>Gamma delta.</p>';
      const changed = '<p>Alpha </p><p>delta.</p>';
      const saveHandler = vi.fn().mockResolvedValue(true);
      wrapper = mount(NextLevelEditor, { props: { modelValue: original, defaultViewMode: mode, saveHandler }, attachTo: document.body });
      await nextTick();
      if (mode === 'split') await wrapper.findAll('.split-toggle-btn')[1].trigger('click');
      await nextTick();
      const root = wrapper.find('[role="textbox"][aria-label="Rich text editor"]').element as HTMLElement;
      root.focus();
      const paragraphs = root.querySelectorAll('p');
      window.getSelection()!.setBaseAndExtent(paragraphs[0].firstChild!, 6, paragraphs[1].firstChild!, 6);
      const before = wrapper.emitted('update:modelValue')?.length ?? 0;
      root.dispatchEvent(software
        ? new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertParagraph' })
        : new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));
      await nextTick();
      expect(root.innerHTML).toBe(changed);
      expect((wrapper.emitted('update:modelValue') ?? []).slice(before)).toEqual([[changed]]);
      const vm = wrapper.vm as unknown as { undo: () => void; redo: () => void; htmlContent: string; codeContent: string };
      expect(vm.htmlContent).toBe(changed);
      vm.undo();
      await nextTick();
      expect(root.innerHTML).toBe(original);
      expect(window.getSelection()!.getRangeAt(0).startOffset).toBe(6);
      expect(window.getSelection()!.getRangeAt(0).endOffset).toBe(6);
      vm.redo();
      await nextTick();
      expect(root.innerHTML).toBe(changed);
      expect(vm.htmlContent).toBe(changed);
      expect(vm.codeContent).toBe(changed);
      await vi.advanceTimersByTimeAsync(2100);
      expect(saveHandler).toHaveBeenCalledTimes(1);
      expect(saveHandler).toHaveBeenLastCalledWith(changed);
    });
  }
});
