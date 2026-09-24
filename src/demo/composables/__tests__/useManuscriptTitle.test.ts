import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { useManuscriptTitle } from '../useManuscriptTitle';

let scope: EffectScope;
beforeEach(() => { vi.useFakeTimers(); scope = effectScope(); });
afterEach(() => { scope.stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('manuscript header during writing', () => {
  it('reads the first formatted title immediately when restoring a book', () => {
    const html = ref('<h1>The <em>quiet</em> &amp; the sea</h1><h1>Another heading</h1>');
    const title = scope.run(() => useManuscriptTitle(html, ref(0)))!;
    expect(title.value).toBe('The quiet & the sea');
  });

  it('does not reparse the whole book during a continuous typing burst', async () => {
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const book = '<h1>The first draft</h1>' + '<p>A page of the manuscript.</p>'.repeat(1000);
    const html = ref(book);
    const title = scope.run(() => useManuscriptTitle(html, ref(0)))!;
    for (let index = 1; index <= 20; index++) {
      html.value = book + `<p>${'a'.repeat(index)}</p>`;
      await nextTick();
      vi.advanceTimersByTime(100);
    }
    expect(parse).toHaveBeenCalledTimes(1);
    expect(title.value).toBe('The first draft');
    vi.advanceTimersByTime(250);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('uses the latest title when the writer pauses', async () => {
    const html = ref('<h1>Draft</h1>');
    const title = scope.run(() => useManuscriptTitle(html, ref(0)))!;
    html.value = '<h1>A';
    await nextTick();
    html.value = '<h1>A finished title</h1>';
    await nextTick();
    vi.advanceTimersByTime(250);
    expect(title.value).toBe('A finished title');
  });

  it('clears the title immediately for a new blank document and cancels stale work', async () => {
    const html = ref('<h1>Old book</h1>');
    const revision = ref(0);
    const title = scope.run(() => useManuscriptTitle(html, revision))!;
    html.value = '<h1>Unfinished edit</h1>';
    await nextTick();
    html.value = '';
    revision.value++;
    await nextTick();
    expect(title.value).toBe('');
    vi.advanceTimersByTime(500);
    expect(title.value).toBe('');
  });

  it('updates a replacement template immediately and falls back when its heading is removed', async () => {
    const html = ref('<h1>Old book</h1>');
    const revision = ref(0);
    const title = scope.run(() => useManuscriptTitle(html, revision))!;
    html.value = '<h1>New template</h1>';
    revision.value++;
    await nextTick();
    expect(title.value).toBe('New template');
    html.value = '<p>No title now.</p>';
    await nextTick();
    vi.advanceTimersByTime(250);
    expect(title.value).toBe('');
  });

  it('cancels pending analysis when the workspace closes', async () => {
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const html = ref('<h1>Draft</h1>');
    scope.run(() => useManuscriptTitle(html, ref(0)));
    html.value = '<h1>Later</h1>';
    await nextTick();
    scope.stop();
    vi.advanceTimersByTime(500);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
