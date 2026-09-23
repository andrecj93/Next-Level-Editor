import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useComments } from '../useComments';

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
});

function passage() {
  const editor = document.createElement('div');
  editor.innerHTML = '<p>Repeated passage</p><p>Repeated passage</p>';
  document.body.append(editor);
  const changed = vi.fn();
  const comments = useComments({ editorElement: ref(editor), onAnchorStateChanged: changed });
  const range = document.createRange();
  range.selectNodeContents(editor.firstElementChild!);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  comments.captureSelection();
  const thread = comments.addThread('Keep the discussion')!;
  return { editor, comments, thread, changed };
}

describe('comment anchor identity', () => {
  it('does not attach a deleted passage to identical text at its former path', () => {
    const { editor, comments, thread, changed } = passage();
    editor.firstElementChild!.remove();
    comments.restoreThreads();
    expect(editor.querySelector('.comment-highlight')).toBeNull();
    expect(editor.textContent).toBe('Repeated passage');
    expect(comments.threads.value[0].anchorStatus).toBe('orphaned');
    expect(comments.threads.value[0].highlightElement).toBeUndefined();
    expect(changed).toHaveBeenLastCalledWith(thread.id, 'orphaned');
    const calls = changed.mock.calls.length;
    comments.restoreThreads();
    expect(changed).toHaveBeenCalledTimes(calls);
  });

  it('retains the orphan outcome and discussion across save and reload', () => {
    const { editor, comments } = passage();
    editor.firstElementChild!.remove();
    comments.restoreThreads();
    const saved = comments.exportThreads();
    const restored = useComments({ editorElement: ref(editor) });
    expect(restored.importThreads(saved)).toBe(true);
    expect(editor.querySelector('.comment-highlight')).toBeNull();
    expect(restored.threads.value[0].anchorStatus).toBe('orphaned');
    expect(restored.threads.value[0].comments[0].content).toBe('Keep the discussion');
  });

  it('keeps the same live mark and selection when an anchored block is moved', () => {
    const { editor, comments, thread } = passage();
    const mark = editor.querySelector('.comment-highlight')!;
    const text = mark.firstChild!;
    document.getSelection()!.setPosition(text, 3);
    editor.append(editor.firstElementChild!);
    // Moving the block can reset a browser selection. Set the writer's caret
    // after that operation, then ensure reconciliation does not replace it.
    document.getSelection()!.setPosition(text, 3);
    comments.restoreThreads();
    comments.restoreThreads();
    expect(editor.querySelector('.comment-highlight')).toBe(mark);
    expect(document.getSelection()!.focusNode).toBe(text);
    expect(document.getSelection()!.focusOffset).toBe(3);
    expect(comments.threads.value[0].anchorStatus).toBe('attached');
    mark.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(comments.activeThreadId.value).toBe(thread.id);
  });

  it('reattaches when undo restores the actual mark, without losing replies', () => {
    const { editor, comments, thread } = passage();
    const savedHtml = editor.innerHTML;
    editor.firstElementChild!.remove();
    comments.restoreThreads();
    comments.addReply(thread.id, 'Reply while passage is absent');
    editor.innerHTML = savedHtml;
    comments.restoreThreads();
    expect(comments.threads.value[0].anchorStatus).toBe('attached');
    expect(comments.threads.value[0].comments).toHaveLength(2);
    expect(editor.querySelectorAll('.comment-highlight')).toHaveLength(1);
  });
});
