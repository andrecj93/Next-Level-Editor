import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';
import { createTypingPlaceholder } from '../../utils/typingPlaceholder';

let wrapper: VueWrapper | null = null;
afterEach(() => { wrapper?.unmount(); wrapper = null; window.getSelection()?.removeAllRanges(); });

describe('typing anchor input lifecycle', () => {
  for (const mode of ['editor', 'split'] as const) {
    it(`waits for IME composition to commit in the ${mode} surface`, async () => {
      wrapper = mount(NextLevelEditor, { props: { modelValue: '<p>Before </p>', defaultViewMode: mode }, attachTo: document.body });
      await nextTick();
      if (mode === 'split') {
        await wrapper.findAll('.split-toggle-btn')[1].trigger('click');
        await nextTick();
      }
      const surface = wrapper.find('[role="textbox"][aria-label="Rich text editor"]');
      const element = surface.element as HTMLElement;
      const placeholder = createTypingPlaceholder(document);
      element.querySelector('p')!.appendChild(placeholder);
      const text = placeholder.firstChild as Text;
      text.appendData('日本語');
      window.getSelection()!.setBaseAndExtent(text, text.length, text, text.length);
      const before = wrapper.emitted('update:modelValue')?.length ?? 0;
      await surface.trigger('beforeinput', { inputType: 'deleteCompositionText', isComposing: true });
      await surface.trigger('input', { inputType: 'insertCompositionText', isComposing: true });
      expect(element.contains(placeholder)).toBe(true);
      expect(wrapper.emitted('update:modelValue')?.length ?? 0).toBe(before);
      await surface.trigger('compositionend');
      expect(element.textContent).toBe('Before 日本語');
      expect(element.querySelector('[data-nle-typing-placeholder]')).toBeNull();
      expect(window.getSelection()!.anchorNode).toBe(text);
      expect(window.getSelection()!.anchorOffset).toBe(3);
      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['<p>Before 日本語</p>']);
    });
  }

  it('does not process a deletion request in a read-only surface', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '<p>Before</p>', readonly: true }, attachTo: document.body });
    await nextTick();
    const surface = wrapper.find('[role="textbox"][aria-label="Rich text editor"]');
    const placeholder = createTypingPlaceholder(document);
    surface.element.firstChild!.appendChild(placeholder);
    await surface.trigger('beforeinput', { inputType: 'deleteContentBackward' });
    expect(surface.element.contains(placeholder)).toBe(true);
  });
});
