import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { provideEditorLocale, useEditorLocale } from '../useEditorLocale';
import EditorFooter from '../../components/EditorFooter.vue';
import ToolbarSection from '../../components/ToolbarSection.vue';
import CommandPalette from '../../components/CommandPalette.vue';

describe('locale providers in a real component tree', () => {
  it('translates active dropdown captions and searches command names in the displayed language', async () => {
    const sink = vi.fn();
    const wrapper = mount(defineComponent({ setup() {
      provideEditorLocale(() => 'pt-PT', undefined, undefined, () => ({ id: 'translated-controls', onDiagnostic: sink }));
      return () => h('main', [
        h(ToolbarSection, { type: 'dropdown', label: 'Format', tooltip: 'Paragraph format', items: [{ label: 'Paragraph', isActive: () => true }] }),
        h(CommandPalette, { show: true, commands: [{ id: 'save', name: 'Save', description: 'Save checkpoint', category: 'Tools', icon: 'S', action() {} }] }),
      ]);
    } }));
    expect(wrapper.find('.dropdown-label').text()).toBe('Parágrafo');
    expect(wrapper.find('[data-tooltip]').attributes('data-tooltip')).toBe('Formato do parágrafo');
    await wrapper.find('.command-palette input').setValue('guardar');
    expect(wrapper.find('.command-name').text()).toBe('Guardar');
    expect(sink.mock.calls.some(([record]) => record.detail.reason === 'missing_messages')).toBe(false);
    wrapper.unmount();
  });

  it('reports bounded missing-key counts and invalid locales without exposing labels or private locale tags', async () => {
    const language = ref('pt-PT-x-private');
    const sink = vi.fn();
    const wrapper = mount(defineComponent({ setup() {
      const locale = provideEditorLocale(() => language.value, undefined, undefined, () => ({ id: 'locale-fixture', onDiagnostic: sink }));
      return () => h('p', [locale.t('Private missing label'), locale.t('Private missing label'), locale.t('Save')]);
    } }));
    await Promise.resolve();
    const missing = sink.mock.calls.map(([record]) => record).find(record => record.detail.reason === 'missing_messages');
    expect(missing.detail).toMatchObject({ locale: 'pt-PT', missingKeys: 1, missingKeysCapped: false });
    expect(JSON.stringify(sink.mock.calls)).not.toContain('Private missing label');
    expect(JSON.stringify(sink.mock.calls)).not.toContain('x-private');
    language.value = 'private_invalid_locale';
    await nextTick();
    expect(sink.mock.lastCall?.[0]).toMatchObject({ event: 'locale.failed', detail: { reason: 'invalid_locale', locale: 'en', missingKeys: 0 } });
    expect(wrapper.text()).toContain('Save');
    wrapper.unmount();
  });

  it('reactively updates descendants and leaves a neighboring editor in its own locale', async () => {
    const language = ref('en');
    const Child = defineComponent({ setup() { const f = useEditorLocale(); return () => h('span', { dir: f.direction.value }, f.t('{count} words', { count: 2 })); } });
    const Editor = defineComponent({ props: { ownLocale: { type: String, required: true } }, setup(props) { provideEditorLocale(() => props.ownLocale); return () => h(Child); } });
    const wrapper = mount(defineComponent({ setup() { return () => h('main', [h(Editor, { ownLocale: language.value }), h(Editor, { ownLocale: 'pt-PT' })]); } }));
    expect(wrapper.findAll('span').map(x => x.text())).toEqual(['2 words', '2 palavras']);
    language.value = 'ar';
    await nextTick();
    expect(wrapper.findAll('span').map(x => x.attributes('dir'))).toEqual(['rtl', 'ltr']);
    expect(wrapper.findAll('span')[1].text()).toBe('2 palavras');
    wrapper.unmount();
  });

  it('uses grammatical counts in visible footer labels and accessible writing-note descriptions', () => {
    const wrapper = mount(defineComponent({ setup() {
      provideEditorLocale(() => 'pt-PT');
      return () => h(EditorFooter, { wordCount: 1, characterCount: 2, writingMode: true, writingNoteCount: 1 });
    } }));
    expect(wrapper.find('.word-count').text()).toBe('1 palavra');
    expect(wrapper.find('.char-count').text()).toBe('2 caracteres');
    expect(wrapper.find('[aria-description]').attributes('aria-description')).toBe('1 nota de escrita pronta para revisão');
    wrapper.unmount();
  });
});
