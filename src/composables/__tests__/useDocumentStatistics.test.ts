import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useDocumentStatistics } from '../useDocumentStatistics';
import * as commands from '../../utils/commands';

const book = '<p>Once upon a time.</p>'.repeat(1000);
const setup = (initial = book) => {
  const html = ref(initial);
  const editor = ref<HTMLElement | null>(null);
  const scope = effectScope();
  const counts = scope.run(() => useDocumentStatistics(html, editor))!;
  return { html, editor, scope, counts };
};
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('live manuscript counts', () => {
  it('counts a restored book immediately and counts a burst only after the writing pause', async () => {
    vi.useFakeTimers();
    const read = vi.spyOn(commands, 'getTextStatistics');
    const { html, counts, scope } = setup();
    expect(counts.value.wordCount).toBe(4000);
    for (let i = 1; i <= 5; i++) {
      html.value = book + `<p>${'word '.repeat(i)}</p>`;
      await nextTick();
      vi.advanceTimersByTime(100);
    }
    expect(read).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(50);
    expect(counts.value).toEqual(commands.getTextStatistics(html.value));
    expect(counts.value.wordCount).toBe(4005);
    scope.stop();
  });

  it('updates at least once a second during uninterrupted writing', async () => {
    vi.useFakeTimers();
    const { html, counts, scope } = setup();
    for (let i = 1; i <= 10; i++) {
      html.value = book + `<p>${'word '.repeat(i)}</p>`;
      await nextTick();
      vi.advanceTimersByTime(100);
    }
    expect(counts.value.wordCount).toBe(4010);
    html.value = book + '<p>The end.</p>';
    await nextTick();
    vi.advanceTimersByTime(150);
    expect(counts.value.wordCount).toBe(4002);
    scope.stop();
  });

  it('clears a pending book count when a short document replaces it', async () => {
    vi.useFakeTimers();
    const { html, counts, scope } = setup();
    html.value += '<p>Old ending</p>';
    await nextTick();
    html.value = '<p>A new start</p>';
    await nextTick();
    expect(counts.value.wordCount).toBe(3);
    vi.advanceTimersByTime(1100);
    expect(counts.value.wordCount).toBe(3);
    html.value = '';
    await nextTick();
    expect(counts.value).toEqual({ wordCount: 0, characterCount: 0 });
    scope.stop();
  });

  it('reads a newly mounted rich-text surface immediately', async () => {
    vi.useFakeTimers();
    const { html, editor, counts, scope } = setup();
    const root = document.createElement('div');
    root.innerHTML = book + '<p>A different ending.</p>';
    html.value = root.innerHTML;
    editor.value = root;
    await nextTick();
    expect(counts.value.wordCount).toBe(4003);
    scope.stop();
  });

  it('uses the latest source after undo or redo, not a captured stale string', async () => {
    vi.useFakeTimers();
    const { html, counts, scope } = setup();
    html.value = book + '<p>Three extra words</p>';
    await nextTick();
    html.value = book;
    await nextTick();
    vi.advanceTimersByTime(150);
    expect(counts.value.wordCount).toBe(4000);
    html.value = book + '<p>Three extra words</p>';
    await nextTick();
    vi.advanceTimersByTime(150);
    expect(counts.value.wordCount).toBe(4003);
    scope.stop();
  });

  it('cancels pending work when the editor is disposed', async () => {
    vi.useFakeTimers();
    const read = vi.spyOn(commands, 'getTextStatistics');
    const { html, scope } = setup();
    html.value += '<p>An ending</p>';
    await nextTick();
    scope.stop();
    vi.advanceTimersByTime(1100);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
