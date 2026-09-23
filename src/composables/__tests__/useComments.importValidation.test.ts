import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useComments } from "../useComments";

const snapshot = () => [{
  id: 'thread-1', status: 'open',
  rangeData: { startContainerPath: [0, 0], startOffset: 0, endContainerPath: [0, 0], endOffset: 5, text: 'Hello' },
  comments: [{ id: 'comment-1', author: { id: 'writer', name: 'Writer' }, content: 'Keep this.', createdAt: '2026-09-23T10:00:00Z' }],
  createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z',
}];

afterEach(() => vi.restoreAllMocks());

describe('comment snapshot validation', () => {
  it.each([
    ['invalid date', (data: ReturnType<typeof snapshot>) => { data[0].createdAt = 'not a date'; }],
    ['duplicate thread', (data: ReturnType<typeof snapshot>) => { data.push(data[0]); }],
    ['negative offset', (data: ReturnType<typeof snapshot>) => { data[0].rangeData.startOffset = -1; }],
    ['invalid author', (data: ReturnType<typeof snapshot>) => { data[0].comments[0].author = null as never; }],
  ] as const)('rejects %s without touching existing discussion or prose', (_label, corrupt) => {
    const editor = document.createElement('div');
    editor.innerHTML = '<p>Hello world</p>';
    const comments = useComments({ editorElement: ref(editor) });
    expect(comments.importThreads(JSON.stringify(snapshot()))).toBe(true);
    const before = comments.exportThreads();
    const anchor = editor.querySelector('.comment-highlight');
    const invalid = snapshot();
    corrupt(invalid);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(comments.importThreads(JSON.stringify(invalid))).toBe(false);
    expect(comments.exportThreads()).toBe(before);
    expect(editor.querySelector('.comment-highlight')).toBe(anchor);
    expect(editor.textContent).toBe('Hello world');
    expect(errors.mock.calls.flat().join(' ')).not.toContain('Keep this.');
  });

  it('clears known anchors on an empty import and can reimport a deleted thread', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<p>Hello world</p>';
    const comments = useComments({ editorElement: ref(editor) });
    comments.importThreads(JSON.stringify(snapshot()));
    comments.setActiveThread('thread-1');
    expect(comments.importThreads('[]')).toBe(true);
    expect(comments.activeThreadId.value).toBeNull();
    expect(editor.querySelector('.comment-highlight')).toBeNull();
    // Reimport with its document, as a host restoring a saved snapshot does.
    editor.innerHTML = '<p>Hello world</p>';
    expect(comments.importThreads(JSON.stringify(snapshot()))).toBe(true);
    expect(editor.querySelector('.comment-highlight')?.textContent).toBe('Hello');
  });

  it('accepts quoted identifiers without interpreting them as CSS selectors', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<p>Hello world</p>';
    const comments = useComments({ editorElement: ref(editor) });
    const data = snapshot();
    data[0].id = 'quoted"identifier';
    expect(comments.importThreads(JSON.stringify(data))).toBe(true);
    comments.resolveThread(data[0].id);
    expect(editor.querySelector('.comment-highlight-resolved')?.textContent).toBe('Hello');
  });

  it('applies imported resolution to an existing anchor while undo still follows the HTML', () => {
    const editor = document.createElement('div');
    editor.innerHTML = '<p>Hello world</p>';
    const comments = useComments({ editorElement: ref(editor) });
    comments.importThreads(JSON.stringify(snapshot()));
    const resolved = snapshot();
    resolved[0].status = 'resolved';
    comments.importThreads(JSON.stringify(resolved));
    expect(editor.querySelector('.comment-highlight-resolved')).not.toBeNull();
    editor.querySelector('.comment-highlight')!.classList.remove('comment-highlight-resolved');
    comments.restoreThreads();
    expect(comments.threads.value[0].status).toBe('open');
  });
});
