import type { Ref } from 'vue';
import { readClipboardData } from '../utils/clipboard';

interface ClipboardPasteOptions {
  editorContent: Ref<HTMLElement | null>;
  readonly: Ref<boolean>;
  onPaste: (event: ClipboardEvent) => void;
  captureSnapshot: () => void;
  notify: (message: string) => void;
}

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
    const data = await readClipboardData();
    if (token !== request) return;
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
      console.debug('[NextLevelEditor] Clipboard paste cancelled', { reason: 'writing-context-changed' });
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
      const event = new ClipboardEvent('paste', { clipboardData: data, cancelable: true });
      options.onPaste(event);
      if (!event.defaultPrevented && !root.ownerDocument.execCommand('insertText', false, data.getData('text/plain'))) {
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
