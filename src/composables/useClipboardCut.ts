import type { Ref } from 'vue';
import { copyHtmlToClipboard } from '../utils/clipboard';
import { serializeEditorSelection } from '../utils/selectionClipboard';
import { rangeForEditableFormatting } from '../utils/rangeContact';

interface ClipboardCutOptions {
  editorContent: Ref<HTMLElement | null>;
  canEdit: () => boolean;
  beforeCut?: () => void;
  commit: () => void;
  notify?: (message: string) => void;
  clearNotification?: (message: string) => void;
}
const waitingMessage = 'Waiting for clipboard access. Your text stays here until it is copied.';

/** A delayed clipboard write must never delete a newer selection or draft. */
export function useClipboardCut(options: ClipboardCutOptions) {
  let request = 0;
  return async () => {
    const token = ++request;
    const root = options.editorContent.value;
    const selection = root?.ownerDocument.getSelection();
    if (!root?.isConnected || !options.canEdit() || !selection?.rangeCount || selection.isCollapsed) return;
    const saved = Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange());
    if (saved.some(range => !root.contains(range.startContainer) || !root.contains(range.endContainer))) return;
    const ranges = saved.map(range => rangeForEditableFormatting(range, root));
    if (ranges.some(range => !range)) {
      options.notify?.('Select the whole variable or embedded item to cut it.');
      return;
    }
    const clipboard = serializeEditorSelection(selection, root, ranges as Range[]);
    if (!clipboard) return;
    const before = root.innerHTML;
    const points = saved.map(range => ({
      start: range.startContainer, startOffset: range.startOffset,
      end: range.endContainer, endOffset: range.endOffset,
    }));
    let timedOut = false;
    const unchanged = () => {
      const current = root.ownerDocument.getSelection();
      const focus = root.ownerDocument.activeElement;
      return !timedOut && token === request && root.isConnected && root === options.editorContent.value
        && options.canEdit() && root.innerHTML === before
        && current?.rangeCount === points.length
        && points.every((point, i) => {
          const range = current.getRangeAt(i);
          return root.contains(point.start) && root.contains(point.end)
            && range.startContainer === point.start && range.startOffset === point.startOffset
            && range.endContainer === point.end && range.endOffset === point.endOffset;
        }) && (!focus || focus === root.ownerDocument.body || root.contains(focus));
    };
    if (!unchanged()) return;
    console.debug('[NextLevelEditor] Clipboard cut requested');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const waiting = setTimeout(() => {
      if (unchanged()) options.notify?.(waitingMessage);
    }, 800);
    let copied = false;
    try {
      copied = await Promise.race([
        copyHtmlToClipboard(clipboard.html, clipboard.text, unchanged),
        new Promise<boolean>(resolve => {
          timeout = setTimeout(() => { timedOut = true; resolve(false); }, 10_000);
        }),
      ]);
    } catch (error) {
      console.warn('[NextLevelEditor] Clipboard cut failed', { reason: error instanceof Error ? error.name : 'CutError' });
    } finally {
      clearTimeout(waiting);
      clearTimeout(timeout);
    }
    if (token !== request) return;
    options.clearNotification?.(waitingMessage);
    if (timedOut) {
      console.debug('[NextLevelEditor] Clipboard cut cancelled', { reason: 'clipboard-write-timeout' });
      options.notify?.('Clipboard access took too long. Nothing was cut. Use Ctrl+X or ⌘X.');
      return;
    }
    if (!unchanged()) {
      console.debug('[NextLevelEditor] Clipboard cut cancelled', { reason: 'writing-context-changed' });
      options.notify?.('Your writing position changed. Nothing was cut.');
      return;
    }
    if (!copied) {
      options.notify?.('Could not cut. Use Ctrl+X or ⌘X to try again.');
      return;
    }
    options.beforeCut?.();
    // A host callback may synchronously replace the document.
    if (!unchanged()) return;
    selection.removeAllRanges();
    for (const range of ranges) selection.addRange(range!);
    selection.deleteFromDocument();
    options.commit();
    console.debug('[NextLevelEditor] Clipboard cut completed', { ranges: ranges.length });
  };
}
