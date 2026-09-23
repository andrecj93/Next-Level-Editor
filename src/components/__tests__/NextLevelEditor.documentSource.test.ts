import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('document source handoff', () => {
  it('preserves canonical block identities and language when source editing loses focus', async () => {
    vi.useFakeTimers();
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: '<p>Before</p>', defaultViewMode: 'code', documentOptions: { id: 'source-document' }, contentLanguage: 'pt-PT', contentDirection: 'ltr' },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    const source = wrapper.get<HTMLTextAreaElement>('.code-editor');
    const input = '<h2>Chapter</h2><p>She returned in order to find the house.</p>';
    await source.setValue(input);
    expect(source.element.value).toBe(input);
    const root = wrapper.get('.editor-content');
    const canonical = root.element.innerHTML;
    const identities = root.findAll('[data-nle-id]').map(block => block.attributes('data-nle-id'));
    expect(identities).toHaveLength(2);
    expect(new Set(identities).size).toBe(2);
    expect(root.findAll('[lang="pt-PT"][dir="ltr"]')).toHaveLength(2);
    await source.trigger('blur');
    expect(root.element.innerHTML).toBe(canonical);
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(canonical);
    // Repeated focus changes are passive and cannot regenerate identities.
    await source.trigger('blur');
    expect(root.element.innerHTML).toBe(canonical);
  });
});
