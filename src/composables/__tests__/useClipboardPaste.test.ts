import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useClipboardPaste, type ClipboardPasteInput } from '../useClipboardPaste';
import { readClipboardData } from '../../utils/clipboard';
vi.mock('../../utils/clipboard', () => ({ readClipboardData: vi.fn() }));

const transfer = (html = '', text = 'Pasted') => {
  const data = new DataTransfer();
  if (html) data.setData('text/html', html);
  if (text) data.setData('text/plain', text);
  return data;
};

describe('context-menu paste intent', () => {
  let root: HTMLDivElement;
  let originalExec: PropertyDescriptor | undefined;
  const setup = () => {
    const editorContent = ref<HTMLElement | null>(root);
    const readonly = ref(false);
    const onPaste = vi.fn((event: ClipboardPasteInput) => event.preventDefault());
    const captureSnapshot = vi.fn();
    const notify = vi.fn();
    const clearNotification = vi.fn();
    return { editorContent, readonly, onPaste, captureSnapshot, notify, clearNotification, paste: useClipboardPaste({ editorContent, readonly, onPaste, captureSnapshot, notify, clearNotification }) };
  };
  beforeEach(() => {
    vi.clearAllMocks();
    root = document.createElement('div');
    root.contentEditable = 'true';
    root.innerHTML = '<p>Replace this passage.</p>';
    document.body.appendChild(root);
    root.focus();
    const range = document.createRange();
    range.selectNodeContents(root.firstElementChild!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    originalExec = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(document, 'execCommand', { value: vi.fn(() => true), configurable: true });
    vi.mocked(readClipboardData).mockResolvedValue(transfer('<em>Pasted</em>'));
  });
  afterEach(() => {
    vi.useRealTimers();
    root.remove();
    window.getSelection()!.removeAllRanges();
    if (originalExec) Object.defineProperty(document, 'execCommand', originalExec);
    else delete (document as unknown as { execCommand?: unknown }).execCommand;
    vi.restoreAllMocks();
  });

  it('delegates rich content to the same paste handler without inserting text twice', async () => {
    const state = setup();
    await state.paste();
    expect(state.onPaste).toHaveBeenCalledOnce();
    expect(state.onPaste.mock.calls[0][0].clipboardData!.getData('text/html')).toBe('<em>Pasted</em>');
    expect(document.execCommand).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(root);
  });

  it('inserts plain text literally when the shared handler leaves it to the browser', async () => {
    const state = setup();
    state.onPaste.mockImplementation(() => {});
    vi.mocked(readClipboardData).mockResolvedValue(transfer('', '<em>literal</em>'));
    await state.paste();
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '<em>literal</em>');
  });

  for (const change of ['content', 'position', 'selection', 'document', 'readonly', 'focus'] as const) {
    it(`cancels a delayed clipboard read when ${change} changes`, async () => {
      let resolve!: (value: DataTransfer) => void;
      vi.mocked(readClipboardData).mockReturnValue(new Promise(done => { resolve = done; }));
      const state = setup();
      const pending = state.paste();
      let other: HTMLInputElement | undefined;
      if (change === 'content') root.firstElementChild!.textContent = 'A newer revision.';
      if (change === 'position') window.getSelection()!.collapseToEnd();
      if (change === 'selection') window.getSelection()!.removeAllRanges();
      if (change === 'document') state.editorContent.value = document.createElement('div');
      if (change === 'readonly') state.readonly.value = true;
      if (change === 'focus') { other = document.createElement('input'); document.body.appendChild(other); other.focus(); }
      const before = root.innerHTML;
      resolve(transfer('<em>Pasted</em>'));
      await pending;
      expect(root.innerHTML).toBe(before);
      expect(state.onPaste).not.toHaveBeenCalled();
      expect(state.captureSnapshot).not.toHaveBeenCalled();
      expect(state.notify).toHaveBeenCalledWith('Your writing position changed. Paste again where you want it.');
      other?.remove();
    });
  }

  it('ignores an older request when a newer paste is pending', async () => {
    const resolve: Array<(value: DataTransfer) => void> = [];
    vi.mocked(readClipboardData).mockImplementation(() => new Promise(done => resolve.push(done)));
    const state = setup();
    const first = state.paste();
    const second = state.paste();
    resolve[0](transfer('<em>Old</em>'));
    await first;
    expect(state.onPaste).not.toHaveBeenCalled();
    resolve[1](transfer('<em>New</em>'));
    await second;
    expect(state.onPaste).toHaveBeenCalledOnce();
    expect(state.onPaste.mock.calls[0][0].clipboardData!.getData('text/html')).toBe('<em>New</em>');
  });

  it('keeps the selected prose intact when access fails or the clipboard is empty', async () => {
    const state = setup();
    const before = root.innerHTML;
    vi.mocked(readClipboardData).mockResolvedValueOnce(null).mockResolvedValueOnce(transfer('', ''));
    await state.paste();
    await state.paste();
    expect(root.innerHTML).toBe(before);
    expect(state.onPaste).not.toHaveBeenCalled();
    expect(state.captureSnapshot).not.toHaveBeenCalled();
    expect(state.notify).toHaveBeenCalledTimes(2);
  });

  it('explains a stalled permission request and never applies a late clipboard result after timeout', async () => {
    vi.useFakeTimers();
    let resolve!: (value: DataTransfer) => void;
    vi.mocked(readClipboardData).mockReturnValue(new Promise(done => { resolve = done; }));
    const state = setup();
    const before = root.innerHTML;
    const pending = state.paste();
    await vi.advanceTimersByTimeAsync(800);
    expect(state.notify).toHaveBeenCalledWith('Waiting for clipboard access. You can also paste with Ctrl+V or ⌘V.');
    await vi.advanceTimersByTimeAsync(9_200);
    await pending;
    expect(state.notify).toHaveBeenLastCalledWith('Clipboard access took too long. Use Ctrl+V or ⌘V to paste.');
    resolve(transfer('<em>Too late</em>'));
    await Promise.resolve();
    expect(root.innerHTML).toBe(before);
    expect(state.onPaste).not.toHaveBeenCalled();
    expect(state.captureSnapshot).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears waiting feedback when the clipboard becomes available', async () => {
    vi.useFakeTimers();
    let resolve!: (value: DataTransfer) => void;
    vi.mocked(readClipboardData).mockReturnValue(new Promise(done => { resolve = done; }));
    const state = setup();
    const pending = state.paste();
    await vi.advanceTimersByTimeAsync(800);
    expect(state.notify).toHaveBeenCalledOnce();
    resolve(transfer('<em>Ready</em>'));
    await pending;
    expect(state.clearNotification).toHaveBeenCalledWith('Waiting for clipboard access. You can also paste with Ctrl+V or ⌘V.');
    expect(state.onPaste).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
