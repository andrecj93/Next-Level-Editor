import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

describe('clear formatting editor guards', () => {
  let wrapper: VueWrapper | undefined;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.useRealTimers();
    document.body.innerHTML = '';
  });
  const prepare = async (props: { readonly?: boolean; defaultViewMode?: 'code' | 'preview' | 'split' } = {}) => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: '<p>Keep <em>this</em>.</p>', writingMode: true, ...props },
      attachTo: document.body,
    });
    await nextTick();
    const root = wrapper.find('.editor-content, .preview-content-wrapper').element as HTMLElement;
    const text = root.querySelector('em')!.firstChild!;
    window.getSelection()!.setBaseAndExtent(text, 0, text, 4);
    return root;
  };
  const clear = () => (wrapper!.vm as unknown as { handleClearFormatting: () => void }).handleClearFormatting();

  it.each(['code', 'preview', 'split'] as const)('does not clear a hidden manuscript in %s view', async mode => {
    const root = await prepare({ defaultViewMode: mode });
    const before = root.innerHTML;
    clear();
    expect(root.innerHTML).toBe(before);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });

  it('does not mutate a read-only document', async () => {
    const root = await prepare({ readonly: true });
    const before = root.innerHTML;
    clear();
    expect(root.innerHTML).toBe(before);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });

  it('leaves content and history untouched at a collapsed caret', async () => {
    const root = await prepare();
    root.focus();
    const text = root.querySelector('em')!.firstChild!;
    window.getSelection()!.setBaseAndExtent(text, 2, text, 2);
    const before = root.innerHTML;
    clear();
    await nextTick();
    expect(root.innerHTML).toBe(before);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper!.find('[aria-label="Undo"]').attributes('disabled')).toBeDefined();
    expect(wrapper!.find('.toast-notification').text()).toBe('Select formatted text to clear its styling.');
  });
});
