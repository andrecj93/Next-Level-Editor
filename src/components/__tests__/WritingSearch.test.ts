import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideEditorLocale } from '../../composables/useEditorLocale';
import WritingSearch from '../WritingSearch.vue';
import { useFindReplace } from '../../composables/useFindReplace';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); vi.useRealTimers(); });

async function setup(html = '<h2>The library</h2><p>Celia opened the door.</p><p>Celia carried the map.</p><p>Celia stayed.</p>', readonly = false) {
  vi.useFakeTimers();
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.tabIndex = 0;
  editor.innerHTML = html;
  document.body.appendChild(editor);
  const snapshot = vi.fn();
  const engine = useFindReplace({ editorContent: ref(editor), captureSnapshot: snapshot });
  const wrapper = mount(WritingSearch, { attachTo: document.body, props: { show: true, content: html, editor, readonly,
    find: engine.handleFind, replace: engine.handleReplace, replaceAll: engine.handleReplaceAll, clear: engine.clearPendingHighlight } });
  cleanups.push(() => { wrapper.unmount(); document.getSelection()?.removeAllRanges(); editor.remove(); });
  await flushPromises();
  const search = async (query: string) => { await wrapper.get('input[type="text"]').setValue(query); await vi.advanceTimersByTimeAsync(160); await nextTick(); };
  return { wrapper, editor, snapshot, search };
}

describe('WritingSearch', () => {
  it('switches localized search controls without changing the query or readonly document', async () => {
    vi.useFakeTimers();
    const language = ref('pt-PT');
    const editor = document.createElement('div');
    editor.innerHTML = '<p>Celia arrived. Celia stayed.</p>';
    document.body.appendChild(editor);
    const before = editor.innerHTML;
    const snapshot = vi.fn();
    const engine = useFindReplace({ editorContent: ref(editor), captureSnapshot: snapshot });
    const wrapper = mount(defineComponent({ setup() {
      provideEditorLocale(() => language.value);
      return () => h(WritingSearch, { show: true, content: before, editor, readonly: true,
        find: engine.handleFind, replace: engine.handleReplace, replaceAll: engine.handleReplaceAll, clear: engine.clearPendingHighlight });
    } }), { attachTo: document.body });
    cleanups.push(() => { wrapper.unmount(); document.getSelection()?.removeAllRanges(); editor.remove(); });
    await flushPromises();
    await wrapper.get('input[placeholder="Localizar no documento…"]').setValue('Celia');
    await vi.advanceTimersByTimeAsync(160);
    expect(wrapper.get('.search-count').text()).toBe('1 de 2');
    await wrapper.get('[aria-label="Mostrar controlos de substituição"]').trigger('click');
    expect(wrapper.get('.replace-action').attributes('disabled')).toBeDefined();
    language.value = 'en';
    await nextTick();
    expect((wrapper.get('input[placeholder="Find in document…"]').element as HTMLInputElement).value).toBe('Celia');
    expect(wrapper.get('.search-count').text()).toBe('1 of 2');
    expect(editor.innerHTML).toBe(before);
    expect(snapshot).not.toHaveBeenCalled();
  });
  it('searches immediately after a pause and navigates contextual matches without changing prose', async () => {
    const { wrapper, editor, search } = await setup();
    const before = editor.innerHTML;
    await search('Celia');
    expect(wrapper.get('.search-count').text()).toBe('1 of 3');
    expect(wrapper.get('.search-passage').text()).toContain('The library');
    expect(wrapper.get('.search-passage').text()).toContain('opened the door');
    expect(document.activeElement).toBe(wrapper.get('input[type="text"]').element);
    await wrapper.get('[aria-label="Next match"]').trigger('click');
    expect(wrapper.get('.search-count').text()).toBe('2 of 3');
    expect(wrapper.get('.search-passage').text()).toContain('carried the map');
    await wrapper.get('[aria-label="Previous match"]').trigger('click');
    await wrapper.get('[aria-label="Previous match"]').trigger('click');
    expect(wrapper.get('.search-count').text()).toBe('3 of 3');
    expect(editor.innerHTML).toBe(before);
  });

  it('replaces the current occurrence and keeps the real counter when the replacement contains the query', async () => {
    const { wrapper, editor, snapshot, search } = await setup('<p>cat one, cat two, cat three.</p>');
    await search('cat');
    await wrapper.get('[aria-label="Show replacement controls"]').trigger('click');
    await wrapper.get('[placeholder="Replace with…"]').setValue('catlike');
    const replace = wrapper.findAll('.replace-action')[0];
    await replace.trigger('click');
    expect(editor.textContent).toBe('catlike one, cat two, cat three.');
    expect(wrapper.get('.search-count').text()).toBe('2 of 3');
    await replace.trigger('click');
    expect(editor.textContent).toBe('catlike one, catlike two, cat three.');
    expect(wrapper.get('.search-count').text()).toBe('3 of 3');
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('replaces all occurrences once and exposes the result', async () => {
    const { wrapper, editor, snapshot, search } = await setup();
    await search('Celia');
    await wrapper.get('[aria-label="Show replacement controls"]').trigger('click');
    await wrapper.get('[placeholder="Replace with…"]').setValue('Célia');
    await wrapper.findAll('.replace-action')[1].trigger('click');
    expect(editor.textContent?.match(/Célia/g)).toHaveLength(3);
    expect(wrapper.get('.search-count').text()).toBe('No matches');
    expect(wrapper.get('.search-notice').text()).toContain('Replaced 3 occurrences');
    expect(snapshot).toHaveBeenCalledOnce();
  });

  it('recounts changed prose without moving the writer away from the insertion point', async () => {
    const { wrapper, editor, search } = await setup();
    await search('Celia');
    editor.focus();
    editor.lastElementChild!.textContent = 'Celia wrote a new ending.';
    document.getSelection()!.collapse(editor.lastElementChild!.firstChild, 24);
    await wrapper.setProps({ content: editor.innerHTML });
    await vi.advanceTimersByTimeAsync(160);
    expect(document.activeElement).toBe(editor);
    expect(document.getSelection()!.focusNode).toBe(editor.lastElementChild!.firstChild);
    expect(document.getSelection()!.focusOffset).toBe(24);
    expect(wrapper.get('.search-count').text()).toBe('1 of 3');
  });

  it('does not swallow keyboard navigation while a document recount is pending', async () => {
    const { wrapper, editor, search } = await setup();
    await search('Celia');
    await wrapper.get('[aria-label="Next match"]').trigger('click');
    expect(wrapper.get('.search-count').text()).toBe('2 of 3');
    editor.lastElementChild!.append(' She picked up a pen.');
    await wrapper.setProps({ content: editor.innerHTML });
    await wrapper.get('input[type="text"]').trigger('keydown', { key: 'Enter', shiftKey: true });
    expect(wrapper.get('.search-count').text()).toBe('1 of 3');
  });

  it('leaves composition and a read-only document unchanged', async () => {
    const { wrapper, editor, snapshot, search } = await setup('<p>Celia stayed.</p>', true);
    const input = wrapper.get('input[type="text"]');
    await input.trigger('compositionstart');
    await input.setValue('Celia');
    await input.trigger('keydown', { key: 'Enter', isComposing: true });
    await vi.advanceTimersByTimeAsync(180);
    expect(wrapper.find('.search-passage').exists()).toBe(false);
    await input.trigger('compositionend');
    await vi.advanceTimersByTimeAsync(160);
    expect(wrapper.get('.search-count').text()).toBe('1 of 1');
    await search('Celia');
    await wrapper.get('[aria-label="Show replacement controls"]').trigger('click');
    await wrapper.get('[placeholder="Replace with…"]').setValue('Mara');
    await wrapper.get('[placeholder="Replace with…"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.findAll('.replace-action').every(button => button.attributes('disabled') !== undefined)).toBe(true);
    expect(editor.textContent).toBe('Celia stayed.');
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('only handles search shortcuts inside its own workspace and cancels pending search on close', async () => {
    const { wrapper, editor, search } = await setup();
    await search('Celia');
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    cleanups.push(() => outside.remove());
    outside.focus();
    outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(outside);
    editor.focus();
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(wrapper.get('[placeholder="Replace with…"]').element);
    await wrapper.get('input[type="text"]').setValue('Missing');
    await wrapper.setProps({ show: false });
    await vi.advanceTimersByTimeAsync(200);
    expect(wrapper.find('[role="search"]').exists()).toBe(false);
    expect(editor.innerHTML).not.toContain('nle-find');
  });

  it('returns to the found passage on Escape and preserves a writer who moved their caret', async () => {
    const { wrapper, editor, search } = await setup();
    await search('Celia');
    await wrapper.get('[aria-label="Next match"]').trigger('click');
    await wrapper.get('input[type="text"]').trigger('keydown', { key: 'Escape' });
    const match = wrapper.emitted('close')![0][0] as Range;
    expect(match.toString()).toBe('Celia');
    expect(match.startContainer).toBe(editor.querySelectorAll('p')[1].firstChild);

    editor.focus();
    editor.lastElementChild!.append(' Again.');
    await wrapper.setProps({ content: editor.innerHTML });
    document.getSelection()!.collapse(editor.lastElementChild!.firstChild, 12);
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true, cancelable: true }));
    await nextTick();
    await vi.advanceTimersByTimeAsync(160);
    await wrapper.get('input[type="text"]').trigger('keydown', { key: 'Escape' });
    const caret = wrapper.emitted('close')![1][0] as Range;
    expect(caret.collapsed).toBe(true);
    expect(caret.startContainer).toBe(editor.lastElementChild!.firstChild);
    expect(caret.startOffset).toBe(12);
  });
});
