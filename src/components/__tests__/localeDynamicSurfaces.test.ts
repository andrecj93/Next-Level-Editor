import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type VNode } from 'vue';
import { provideEditorLocale } from '../../composables/useEditorLocale';
import { fileManager } from '../../utils/fileManager';
import { reviewWriting } from '../../utils/writingReview';
import ToolbarSection from '../ToolbarSection.vue';
import FontSizeSelector from '../FontSizeSelector.vue';
import HistoryTimeline from '../HistoryTimeline.vue';
import FileManagerModal from '../FileManagerModal.vue';
import WritingStatsPanel from '../WritingStatsPanel.vue';
import WritingCompanion from '../WritingCompanion.vue';
import TemplateModal from '../TemplateModal.vue';
import EmojiPicker from '../EmojiPicker.vue';

let wrapper: VueWrapper;
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function localized(render: () => VNode) {
  const language = ref('en');
  wrapper = mount(defineComponent({ setup() {
    provideEditorLocale(() => language.value);
    return render;
  } }));
  return async (locale: string) => { language.value = locale; await nextTick(); };
}

describe('live localization of dynamic editor controls', () => {
  it('localizes kept-note counts while preserving the decisions and quoted prose', async () => {
    const review = reviewWriting('<p>She returned in order to find the house.</p><p>He waited in order to speak.</p>');
    const dismissed = ref(new Set([review.notes[0].id]));
    const change = localized(() => h(WritingCompanion, { review, dismissedNotes: dismissed.value }));
    expect(wrapper.get('.review-kept').text()).toBe('Review 1 kept note');
    const quotation = wrapper.get('.note-passage').text();
    await change('pt-PT');
    expect(wrapper.get('.review-kept').text()).toBe('Rever 1 nota mantida');
    expect(wrapper.get('.note-passage').text()).toBe(quotation);
    dismissed.value = new Set(review.notes.map(note => note.id));
    await nextTick();
    expect(wrapper.get('.review-kept').text()).toBe('Rever 2 notas mantidas');
    await change('en');
    expect(wrapper.get('.review-kept').text()).toBe('Review 2 kept notes');
    expect(dismissed.value.size).toBe(2);
  });

  it('searches translated emoji names and preserves the inserted emoji', async () => {
    const change = localized(() => h(EmojiPicker, { show: true }));
    await change('pt-PT');
    await wrapper.get('.emoji-search').setValue('lágrimas');
    expect(wrapper.findAll('.emoji-btn')).toHaveLength(1);
    expect(wrapper.get('.emoji-btn').attributes('aria-label')).toBe('cara com lágrimas de alegria');
    await wrapper.get('.emoji-btn').trigger('click');
    expect(wrapper.findComponent(EmojiPicker).emitted('select')).toEqual([['😂']]);
    await change('en');
    expect(wrapper.findAll('.emoji-btn')).toHaveLength(0);
    await wrapper.get('.emoji-search').setValue('tears');
    expect(wrapper.get('.emoji-btn').attributes('aria-label')).toBe('face with tears of joy');
  });
  it('updates shortcuts, disabled explanations and the full accessible font size', async () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Win32');
    const change = localized(() => h('main', [
      h(ToolbarSection, { type: 'buttons', items: [{ id: 'indent', label: 'Decrease Indent', tooltip: 'Decrease Indent', shortcut: 'shift+tab', onClick() {}, isDisabled: () => true }] }),
      h(FontSizeSelector, { modelValue: 'huge' }),
    ]));
    expect(wrapper.get('[data-tooltip]').attributes('data-tooltip')).toBe('Decrease Indent (Shift+Tab) (not available for current selection)');
    expect(wrapper.get('.font-size-button').attributes('aria-label')).toBe('Font size: Huge');
    await change('pt-PT');
    expect(wrapper.get('[data-tooltip]').attributes('data-tooltip')).toBe('Diminuir avanço (Maiús+Tab) (indisponível para a seleção atual)');
    expect(wrapper.get('.font-size-button').attributes('aria-label')).toBe('Tamanho da letra: Muito grande');
    expect(wrapper.get('[data-tooltip]').attributes('disabled')).toBeDefined();
    await wrapper.get('.font-size-button').trigger('click');
    expect(wrapper.get('.size-option.active .size-label').text()).toBe('Muito grande');
    await change('en');
    expect(wrapper.get('.size-option.active .size-label').text()).toBe('Huge');
  });

  it('localizes history controls, dates and digits without translating saved labels or content', async () => {
    const timestamp = Date.UTC(2026, 0, 15, 13, 5);
    const change = localized(() => h(HistoryTimeline, {
      history: [{ id: 'first', content: 'Save', timestamp, label: 'Save' }, { id: 'second', content: 'Second', timestamp }],
      currentIndex: 0, canGoBack: false, canGoForward: true, hasHistory: true, historySize: 2, timelineProgress: 50,
    }));
    expect(wrapper.get('.timeline-title').text()).toBe('History Timeline');
    await change('pt-PT');
    expect(wrapper.get('.timeline-title').text()).toBe('Histórico de versões');
    expect(wrapper.get('.entry-label').text()).toBe('Save');
    expect(wrapper.get('.entry-preview').text()).toBe('Save');
    expect(wrapper.get('.timeline-entry').attributes('aria-label')).toMatch(/^Restaurar Save,/);
    expect(wrapper.findAll('.entry-label')[1].text()).toBe('Versão 2');
    const portugueseTime = wrapper.get('.entry-time').text();
    await change('ar-EG-u-nu-arab');
    expect(wrapper.get('.timeline-progress-text').text()).toBe('١ / ٢');
    expect(wrapper.findAll('.entry-label')[1].text()).toBe('Version ٢');
    expect(wrapper.get('.entry-time').text()).not.toBe(portugueseTime);
  });

  it('retains rejected upload facts so language changes update reasons without retrying files', async () => {
    const open = ref(false);
    const change = localized(() => h(FileManagerModal, { isOpen: open.value }));
    const uploads = vi.spyOn(fileManager, 'uploadFile');
    open.value = true;
    await nextTick();
    const input = wrapper.get('input[type=file]');
    Object.defineProperty(input.element, 'files', { configurable: true, value: [
      new File(['<p>untrusted</p>'], 'rejected.html', { type: 'text/html' }),
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'oversize.txt', { type: 'text/plain' }),
    ] });
    await input.trigger('change');
    await flushPromises();
    expect(wrapper.get('[role=alert]').text()).toContain('0 files uploaded, 2 failed');
    expect(wrapper.get('[role=alert]').text()).toContain('File type text/html is not allowed');
    await change('pt-PT');
    expect(wrapper.get('[role=alert]').text()).toContain('0 ficheiros carregados; falhas: 2');
    expect(wrapper.get('[role=alert]').text()).toContain('O tipo de ficheiro text/html não é permitido');
    expect(wrapper.get('[role=alert]').text()).toContain('10 MB');
    expect(wrapper.get('[role=alert]').text()).not.toContain('File size');
    expect(uploads).toHaveBeenCalledTimes(2);
    await change('en');
    expect(wrapper.get('[role=alert]').text()).toContain('File size exceeds maximum allowed size of 10 MB');
    expect(uploads).toHaveBeenCalledTimes(2);
  });

  it('keeps filenames unchanged across both views and localizes selection, size, date and deletion', async () => {
    vi.spyOn(fileManager, 'getFiles').mockReturnValue([{ id: 'host', name: 'Save', type: 'text/plain', size: 1536, url: 'data:text/plain;base64,QQ==', uploadedAt: new Date('2026-01-15T13:05:00Z') }]);
    const confirmation = vi.fn(() => false);
    vi.stubGlobal('confirm', confirmation);
    const open = ref(false);
    const change = localized(() => h(FileManagerModal, { isOpen: open.value }));
    open.value = true;
    await nextTick();
    expect(wrapper.get('.file-name').text()).toBe('Save');
    expect(wrapper.get('.file-meta').text()).toBe('1.5 KB');
    await change('pt-PT');
    expect(wrapper.get('.file-name').text()).toBe('Save');
    expect(wrapper.get('.file-meta').text()).toBe('1,5 KB');
    expect(wrapper.get('.storage-info').text()).toContain('1 ficheiro');
    expect(wrapper.get('input[type=checkbox]').attributes('aria-label')).toBe('Selecionar Save');
    expect(wrapper.get('.file-actions button').attributes('aria-label')).toBe('Inserir Save no editor');
    await wrapper.get('input[type=checkbox]').trigger('click');
    await wrapper.get('.toolbar-left .btn-danger').trigger('click');
    expect(confirmation).toHaveBeenLastCalledWith('Eliminar 1 ficheiro?');
    await wrapper.findAll('.view-toggle')[1].trigger('click');
    expect(wrapper.get('.file-name-cell').text()).toContain('Save');
    expect(wrapper.get('.actions-cell button').attributes('aria-label')).toBe('Inserir Save no editor');
    expect(wrapper.get('thead input').attributes('aria-label')).toBe('Selecionar todos os ficheiros');
    const date = wrapper.findAll('tbody td')[3].text();
    await change('en');
    expect(wrapper.findAll('tbody td')[3].text()).not.toBe(date);
  });

  it('formats statistics and writing locations while preserving words, passages and template content', async () => {
    const review = reviewWriting('<h1>Save</h1><p>She returned in order to help.</p>');
    const change = localized(() => h('main', [
      h(WritingStatsPanel, {
        stats: { words: 1250, characters: 7000, charactersNoSpaces: 5750, sentences: 1100, paragraphs: 20, syllables: 2000, readingTime: 2.5, speakingTime: 3.5 },
        readability: { fleschReadingEase: 62.5, fleschKincaidGrade: 5.5, gunningFog: 8, colemanLiauIndex: 7.5, automatedReadabilityIndex: 6, averageGradeLevel: 6.75 },
        wordAnalysis: { totalWords: 1250, uniqueWords: 1200, averageWordLength: 5.5, longWords: 1200, veryLongWords: 1100, mostCommonWords: [{ word: 'Save', count: 1100 }] },
      }),
      h(WritingCompanion, { review, dismissedNotes: new Set<string>() }),
      h(TemplateModal, { show: true }),
    ]));
    expect(wrapper.get('.score-value').text()).toBe('62.5');
    expect(wrapper.get('.note-location').text()).toBe('Save · Paragraph 1');
    const originalPassage = wrapper.get('.note-passage').text();
    await change('pt-PT');
    expect(wrapper.get('.score-value').text()).toBe('62,5');
    expect(wrapper.get('.detail-item strong').text()).toContain('5,5');
    expect(wrapper.get('.note-location').text()).toBe('Save · Parágrafo 1');
    expect(wrapper.get('.note-passage').text()).toBe(originalPassage);
    expect(wrapper.get('.note-passage').attributes('aria-label')).toContain('Mostrar excerto em Save · Parágrafo 1:');
    expect(wrapper.get('.writing-note').text()).toContain('«to» transmite a mesma ideia com menos palavras.');
    expect(wrapper.get('.template-info h4').text()).toBe('Documento em branco');
    await wrapper.findAll('.template-card')[1].trigger('click');
    const selected = wrapper.findComponent(TemplateModal).emitted('select')![0][0] as { name: string; content: string };
    expect(selected.name).toBe('Meeting Notes');
    expect(selected.content).toContain('Meeting');
    await change('ar-EG-u-nu-arab');
    expect(wrapper.get('.score-value').text()).toBe('٦٢٫٥');
    expect(wrapper.get('.word-count').text()).toBe('(١٬١٠٠)');
    expect(wrapper.get('.word-tag').text()).toContain('Save');
  });
});
