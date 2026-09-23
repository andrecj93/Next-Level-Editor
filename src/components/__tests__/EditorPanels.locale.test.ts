import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import EditorPanels from '../EditorPanels.vue';
import { provideEditorLocale } from '../../composables/useEditorLocale';
import type { EditorMessages } from '../../types/locale';

let wrapper: VueWrapper | undefined;
afterEach(() => wrapper?.unmount());

describe('localized empty previews', () => {
  it.each(['preview', 'split'] as const)('updates %s prose as text and preserves document markup', async viewMode => {
    const locale = ref('en');
    const messages = ref<EditorMessages>({});
    const html = ref('');
    wrapper = mount(defineComponent({ setup() {
      provideEditorLocale(() => locale.value, () => messages.value);
      return () => h(EditorPanels, { viewMode, htmlContent: html.value });
    } }));
    expect(wrapper.get('.empty-preview').text()).toBe('Start typing to see preview...');
    locale.value = 'pt-PT';
    await nextTick();
    expect(wrapper.get('.empty-preview').text()).toBe('Comece a escrever para ver a pré-visualização...');
    messages.value = { 'Start typing to see preview...': '<img src=x onerror=alert(1)> Preview' };
    await nextTick();
    expect(wrapper.get('.empty-preview').text()).toBe('<img src=x onerror=alert(1)> Preview');
    expect(wrapper.find('.empty-preview img').exists()).toBe(false);
    html.value = '<h2>Original document</h2><p><strong>Keep this formatting.</strong></p>';
    await nextTick();
    expect(wrapper.find('.empty-preview').exists()).toBe(false);
    expect(wrapper.get('.preview-content-wrapper').element.innerHTML).toBe(html.value);
  });
});
