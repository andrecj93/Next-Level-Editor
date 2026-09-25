import type { Ref } from 'vue';
import { readClipboardData } from '../utils/clipboard';

export type ClipboardPasteInput = Pick<ClipboardEvent, 'clipboardData' | 'preventDefault'>;

interface ClipboardPasteOptions {
  editorContent: Ref<HTMLElement | null>;
  readonly: Ref<boolean>;
  onPaste: (event: ClipboardPasteInput) => void;
  captureSnapshot: () => void;
  notify: (message: string) => void;
  clearNotification?: (message: string) => void;
}

const waitingMessage = 'Waiting for clipboard access. You can also paste with Ctrl+V or ⌘V.';

/** Menu Paste shares the keyboard paste pipeline, including sanitization,
 * code blocks, images and history. Clipboard permission must not redirect a
 * delayed paste into a different selection, document, or editing surface.
 */
export function useClipboardPaste(options: ClipboardPasteOptions) {
  let request = 0;
  return async () => {
    const token = ++request;
    const root = options.editorContent.value;
    const selection = root?.ownerDocument.getSelection();
    if (!root || options.readonly.value || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0).cloneRange();
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
    const before = root.innerHTML;
    const position = {
      start: range.startContainer, startOffset: range.startOffset,
      end: range.endContainer, endOffset: range.endOffset,
    };
    console.debug('[NextLevelEditor] Clipboard paste requested');
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const waiting = setTimeout(() => {
      if (token === request && root.isConnected && root === options.editorContent.value) {
        options.notify(waitingMessage);
      }
    }, 800);
    let data: DataTransfer | null;
    try {
      data = await Promise.race([
        readClipboardData(),
        new Promise<null>(resolve => {
          timeout = setTimeout(() => { timedOut = true; resolve(null); }, 10_000);
        }),
      ]);
    } finally {
      clearTimeout(waiting);
      clearTimeout(timeout);
    }
    if (token !== request) return;
    options.clearNotification?.(waitingMessage);
    if (timedOut) {
      console.debug('[NextLevelEditor] Clipboard paste cancelled', { reason: 'clipboard-read-timeout' });
      options.notify('Clipboard access took too long. Use Ctrl+V or ⌘V to paste.');
      return;
    }
    if (!data) {
      options.notify('Clipboard access is unavailable. Use Ctrl+V or ⌘V to paste.');
      return;
    }
    const current = root.ownerDocument.getSelection();
    const currentRange = current?.rangeCount ? current.getRangeAt(0) : null;
    const focus = root.ownerDocument.activeElement;
    const moved = !currentRange || (currentRange.startContainer !== position.start || currentRange.startOffset !== position.startOffset
      || currentRange.endContainer !== position.end || currentRange.endOffset !== position.endOffset);
    if (!root.isConnected || root !== options.editorContent.value || options.readonly.value
      || root.innerHTML !== before || !root.contains(range.startContainer) || !root.contains(range.endContainer)
      || moved || (focus && focus !== root.ownerDocument.body && !root.contains(focus))) {
      console.debug('[NextLevelEditor] Clipboard paste cancelled', {
        reason: 'writing-context-changed',
        changed: [
          !root.isConnected && 'disconnected', root !== options.editorContent.value && 'document',
          options.readonly.value && 'readonly', root.innerHTML !== before && 'content',
          (!root.contains(range.startContainer) || !root.contains(range.endContainer)) && 'range',
          moved && 'selection', (focus && focus !== root.ownerDocument.body && !root.contains(focus)) && 'focus',
        ].filter(Boolean).join(','),
      });
      options.notify('Your writing position changed. Paste again where you want it.');
      return;
    }
    if (!data.getData('text/html') && !data.getData('text/plain') && !data.files.length) {
      options.notify('There is no text or image to paste.');
      return;
    }
    try {
      root.focus({ preventScroll: true });
      current?.removeAllRanges();
      current?.addRange(range);
      options.captureSnapshot();
      // Pass data directly: Firefox discards the supplied DataTransfer when
      // constructing a ClipboardEvent, losing both formatting and image files.
      let handled = false;
      options.onPaste({ clipboardData: data, preventDefault: () => { handled = true; } });
      if (!handled && !root.ownerDocument.execCommand('insertText', false, data.getData('text/plain'))) {
        throw new Error('Paste command unavailable');
      }
      options.captureSnapshot();
      console.debug('[NextLevelEditor] Clipboard paste dispatched', { richText: Boolean(data.getData('text/html')), images: data.files.length });
    } catch (error) {
      console.warn('[NextLevelEditor] Clipboard paste failed', { reason: error instanceof Error ? error.name : 'PasteError' });
      options.notify('Could not paste here. Use Ctrl+V or ⌘V to try again.');
    }
  };
}
