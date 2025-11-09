import { ref, nextTick } from "vue";

export interface HistoryEntry {
  id: string;
  html: string;
  preview: string;
}

/**
 * Composable for managing editor history (undo/redo)
 * Provides a robust undo/redo system with previews
 */
export function useEditorHistory() {
  const history = ref<HistoryEntry[]>([]);
  const historyIndex = ref(-1);
  const isApplyingHistory = ref(false);

  /**
   * Build a preview text from HTML content
   */
  const buildPreview = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    // Normalize whitespace
    const text = temp.innerText.replaceAll(/\s+/g, " ").trim();
    return text.length > 60
      ? `${text.slice(0, 57)}...`
      : text || "Empty content";
  };

  /**
   * Capture a snapshot of current content
   */
  const captureSnapshot = (html: string): void => {
    if (isApplyingHistory.value) return;

    const preview = buildPreview(html);
    const current = history.value[historyIndex.value];

    if (current?.html === html) {
      return;
    }

    history.value = history.value.slice(0, historyIndex.value + 1);
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      html,
      preview,
    };
    history.value.push(entry);
    historyIndex.value = history.value.length - 1;
  };

  /**
   * Apply a history entry to the editor
   */
  const applyHistoryEntry = async (
    entry: HistoryEntry | undefined,
    callback: (html: string) => void
  ): Promise<void> => {
    if (!entry) return;

    isApplyingHistory.value = true;
    callback(entry.html);

    await nextTick();
    isApplyingHistory.value = false;
  };

  /**
   * Undo to previous state
   */
  const undo = (callback: (html: string) => void): void => {
    if (historyIndex.value <= 0) return;
    historyIndex.value -= 1;
    applyHistoryEntry(history.value[historyIndex.value], callback);
  };

  /**
   * Redo to next state
   */
  const redo = (callback: (html: string) => void): void => {
    if (historyIndex.value >= history.value.length - 1) return;
    historyIndex.value += 1;
    applyHistoryEntry(history.value[historyIndex.value], callback);
  };

  /**
   * Check if undo is available
   */
  const canUndo = (): boolean => historyIndex.value > 0;

  /**
   * Check if redo is available
   */
  const canRedo = (): boolean => historyIndex.value < history.value.length - 1;

  return {
    history,
    historyIndex,
    isApplyingHistory,
    captureSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
