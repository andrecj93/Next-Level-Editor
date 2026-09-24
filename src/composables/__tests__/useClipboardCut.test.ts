import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useClipboardCut } from '../useClipboardCut';
import { copyHtmlToClipboard } from '../../utils/clipboard';

vi.mock('../../utils/clipboard', () => ({ copyHtmlToClipboard: vi.fn() }));

describe('clipboard cut preserves the writing intent', () => {
  let root: HTMLDivElement;
  const select = (node: Node, start = 0, end = node.textContent!.length) => {
    const range = document.createRange();
    range.setStart(node, start); range.setEnd(node, end);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
  };
  const setup = () => {
    const editorContent = ref<HTMLElement | null>(root);
    const editable = ref(true);
    const beforeCut = vi.fn();
    const commit = vi.fn();
    const notify = vi.fn();
    const clearNotification = vi.fn();
    return { editorContent, editable, beforeCut, commit, notify, clearNotification,
      cut: useClipboardCut({ editorContent, canEdit: () => editable.value, beforeCut, commit, notify, clearNotification }) };
  };
  beforeEach(() => {
    vi.clearAllMocks();
    root = document.createElement('div');
    root.contentEditable = 'true';
    root.innerHTML = '<p>A <strong>quiet</strong> town.</p>';
    document.body.appendChild(root); root.focus();
    select(root.querySelector('strong')!.firstChild!);
    vi.mocked(copyHtmlToClipboard).mockResolvedValue(true);
  });
  afterEach(() => {
    vi.useRealTimers(); vi.restoreAllMocks();
    root.remove(); window.getSelection()!.removeAllRanges();
  });

  it('copies the inherited inline style before deleting and commits once', async () => {
    const state = setup();
    state.beforeCut.mockImplementation(() => expect(root.textContent).toBe('A quiet town.'));
    state.commit.mockImplementation(() => expect(root.textContent).toBe('A  town.'));
    await state.cut();
    expect(copyHtmlToClipboard).toHaveBeenCalledWith('<strong>quiet</strong>', 'quiet', expect.any(Function));
    expect(state.beforeCut).toHaveBeenCalledOnce();
    expect(state.commit).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(root);
  });

  it.each(['selection', 'content', 'document', 'readonly', 'focus', 'disconnected'] as const)(
    'does not cut after %s changes', async change => {
      let finish!: (value: boolean) => void;
      vi.mocked(copyHtmlToClipboard).mockReturnValue(new Promise(resolve => { finish = resolve; }));
      const state = setup();
      const pending = state.cut();
      let other: HTMLInputElement | undefined;
      if (change === 'selection') select(root.querySelector('p')!.lastChild!);
      if (change === 'content') root.firstElementChild!.firstChild!.textContent = 'A newer ';
      if (change === 'document') state.editorContent.value = document.createElement('div');
      if (change === 'readonly') state.editable.value = false;
      if (change === 'focus') { other = document.createElement('input'); document.body.appendChild(other); other.focus(); }
      if (change === 'disconnected') root.remove();
      const before = root.innerHTML;
      finish(true); await pending;
      expect(root.innerHTML).toBe(before);
      expect(state.beforeCut).not.toHaveBeenCalled();
      expect(state.commit).not.toHaveBeenCalled();
      expect(state.notify).toHaveBeenCalledWith('Your writing position changed. Nothing was cut.');
      other?.remove();
    }
  );

  it('times out without deleting or permitting a later clipboard fallback', async () => {
    vi.useFakeTimers();
    let finish!: (value: boolean) => void;
    vi.mocked(copyHtmlToClipboard).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const state = setup(); const before = root.innerHTML;
    const pending = state.cut();
    await vi.advanceTimersByTimeAsync(800);
    expect(state.notify).toHaveBeenCalledWith('Waiting for clipboard access. Your text stays here until it is copied.');
    await vi.advanceTimersByTimeAsync(9_200); await pending;
    expect(state.notify).toHaveBeenLastCalledWith('Clipboard access took too long. Nothing was cut. Use Ctrl+X or ⌘X.');
    expect(vi.mocked(copyHtmlToClipboard).mock.calls[0][2]!()).toBe(false);
    finish(true); await Promise.resolve();
    expect(root.innerHTML).toBe(before);
    expect(state.commit).not.toHaveBeenCalled();
    expect(state.beforeCut).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears waiting feedback on completion', async () => {
    vi.useFakeTimers();
    let finish!: (value: boolean) => void;
    vi.mocked(copyHtmlToClipboard).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const state = setup(); const pending = state.cut();
    await vi.advanceTimersByTimeAsync(800);
    finish(true); await pending;
    expect(state.clearNotification).toHaveBeenCalledWith('Waiting for clipboard access. Your text stays here until it is copied.');
    expect(state.commit).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the selection and document when copying fails', async () => {
    vi.mocked(copyHtmlToClipboard).mockResolvedValue(false);
    const state = setup(); const before = root.innerHTML;
    await state.cut();
    expect(root.innerHTML).toBe(before);
    expect(window.getSelection()!.toString()).toBe('quiet');
    expect(state.commit).not.toHaveBeenCalled();
    expect(state.beforeCut).not.toHaveBeenCalled();
    expect(state.notify).toHaveBeenCalledWith('Could not cut. Use Ctrl+X or ⌘X to try again.');
  });

  it('ignores the older result when a second Cut is requested', async () => {
    const finish: Array<(value: boolean) => void> = [];
    vi.mocked(copyHtmlToClipboard).mockImplementation(() => new Promise(resolve => finish.push(resolve)));
    const state = setup(); const first = state.cut();
    select(root.querySelector('p')!.lastChild!);
    const second = state.cut();
    finish[0](true); await first;
    expect(state.commit).not.toHaveBeenCalled();
    finish[1](true); await second;
    expect(root.textContent).toBe('A quiet');
    expect(root.querySelector('strong')!.textContent).toBe('quiet');
    expect(state.commit).toHaveBeenCalledOnce();
  });

  it('checks a host callback again before committing the deletion', async () => {
    const state = setup();
    state.beforeCut.mockImplementation(() => { root.firstElementChild!.textContent = 'A replacement document.'; });
    await state.cut();
    expect(root.textContent).toBe('A replacement document.');
    expect(state.commit).not.toHaveBeenCalled();
  });

  it('cuts an entire variable label as one widget', async () => {
    root.innerHTML = '<p>A <span contenteditable="false" data-variable="name">Writer</span>.</p>';
    select(root.querySelector('span')!.firstChild!);
    const state = setup(); await state.cut();
    expect(root.querySelector('span')).toBeNull();
    expect(root.textContent).toBe('A .');
    expect(copyHtmlToClipboard).toHaveBeenCalledWith('<span contenteditable="false" data-variable="name">Writer</span>', 'Writer', expect.any(Function));
  });

  it('refuses a partial variable label', async () => {
    root.innerHTML = '<p>A <span contenteditable="false">Writer</span>.</p>';
    select(root.querySelector('span')!.firstChild!, 1, 4);
    const state = setup(); const before = root.innerHTML;
    await state.cut();
    expect(root.innerHTML).toBe(before);
    expect(copyHtmlToClipboard).not.toHaveBeenCalled();
    expect(state.commit).not.toHaveBeenCalled();
  });
});
