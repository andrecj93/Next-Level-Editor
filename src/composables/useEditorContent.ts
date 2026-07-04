import { ref, watch, nextTick, type Ref } from "vue";
import { useHtmlSanitizer } from "./useHtmlSanitizer";
import { useEditorHistory } from "./useEditorHistory";
import { initializeEmbeddedElements } from "../utils/embeddedResizable";

interface UseEditorContentOptions {
  editorContent: Ref<HTMLDivElement | null>;
  modelValue: Ref<string>;
  onUpdate: (value: string) => void;
  triggerAutoSave?: (content: string) => void;
}

/**
 * Composable for managing editor content, sanitization, and synchronization
 * Handles content validation, history tracking, and model updates
 */
export function useEditorContent(options: UseEditorContentOptions) {
  const { editorContent, modelValue, onUpdate, triggerAutoSave } = options;
  const { sanitizeHtml } = useHtmlSanitizer();
  const {
    history,
    historyIndex,
    isApplyingHistory,
    captureSnapshot,
    undo: performUndo,
    redo: performRedo,
    goToIndex: performGoToIndex,
    clearHistory,
    canUndo,
    canRedo,
  } = useEditorHistory();

  const htmlContent = ref("");
  const codeContent = ref("");

  // Re-bind interactivity to embedded media (images/videos) after any innerHTML
  // reset. Setting innerHTML discards the JS listeners attached at insert time,
  // so without this, inserted media goes inert (loses selection/resize) after
  // undo/redo, code-view round-trips, or loading saved content. [#17]
  const reinitEmbeds = () => {
    if (editorContent.value) {
      initializeEmbeddedElements(editorContent.value);
    }
  };

  /**
   * Apply sanitized content to the editor
   */
  const applySanitizedContent = (value?: string | null) => {
    const sanitized = sanitizeHtml(value);
    if (sanitized !== (value ?? "")) {
      onUpdate(sanitized);
    }
    if (editorContent.value && editorContent.value.innerHTML !== sanitized) {
      editorContent.value.innerHTML = sanitized;
    }
    htmlContent.value = sanitized;
    reinitEmbeds();
  };

  /**
   * Capture a history snapshot and emit update
   */
  const captureAndEmit = (emitUpdate = true) => {
    if (!editorContent.value || isApplyingHistory.value) return;

    const html = editorContent.value.innerHTML;
    htmlContent.value = html;

    captureSnapshot(html);

    if (emitUpdate) {
      const sanitized = sanitizeHtml(html);
      onUpdate(sanitized);

      // Trigger auto-save after updating
      if (triggerAutoSave) {
        triggerAutoSave(sanitized);
      }
    }
  };

  /**
   * Apply a restored history snapshot to the editor and keep every derived
   * reactive ref in sync. Previously undo/redo only wrote innerHTML and emitted
   * the change, leaving htmlContent (which drives the live preview and the
   * footer word/character counts) and codeContent (code view) stale until the
   * next keystroke.
   */
  const applyRestoredSnapshot = (html: string) => {
    if (editorContent.value) {
      editorContent.value.innerHTML = html;
    }
    htmlContent.value = html;
    codeContent.value = html;
    const sanitized = sanitizeHtml(html);
    onUpdate(sanitized);
    reinitEmbeds();
  };

  /**
   * Handle undo operation
   */
  const undo = () => {
    performUndo(applyRestoredSnapshot);
  };

  /**
   * Handle redo operation
   */
  const redo = () => {
    performRedo(applyRestoredSnapshot);
  };

  /**
   * Jump directly to a history entry (history-timeline navigation). Applies the
   * snapshot through the same pipeline as undo/redo so the preview, code view
   * and word counts stay in sync.
   */
  const jumpToHistory = (index: number) => {
    performGoToIndex(index, applyRestoredSnapshot);
  };

  /**
   * Sync code editor content to WYSIWYG editor
   */
  const syncCodeToEditor = (code: string) => {
    codeContent.value = code;
    if (editorContent.value) {
      editorContent.value.innerHTML = code;
      htmlContent.value = code;
      reinitEmbeds();
    }
  };

  /**
   * Sync WYSIWYG editor content to code editor
   */
  const syncEditorToCode = () => {
    if (editorContent.value) {
      const html = editorContent.value.innerHTML;
      codeContent.value = html;
      htmlContent.value = html;
      return html;
    }
    return "";
  };

  // Watch for external model value changes
  watch(
    modelValue,
    (newValue) => {
      if (!editorContent.value) return;
      if (isApplyingHistory.value) return;

      const currentSanitized = sanitizeHtml(editorContent.value.innerHTML);
      const newSanitized = sanitizeHtml(newValue);

      if (currentSanitized !== newSanitized) {
        isApplyingHistory.value = true;
        applySanitizedContent(newValue);
        nextTick(() => {
          isApplyingHistory.value = false;
          captureAndEmit(false);
        });
      }
    },
    { immediate: true }
  );

  // Watch for content changes and trigger auto-save
  if (triggerAutoSave) {
    watch(htmlContent, (newContent) => {
      if (newContent && !isApplyingHistory.value) {
        triggerAutoSave(newContent);
      }
    });
  }

  return {
    htmlContent,
    codeContent,
    history,
    historyIndex,
    isApplyingHistory,
    applySanitizedContent,
    captureAndEmit,
    undo,
    redo,
    jumpToHistory,
    clearHistory,
    canUndo,
    canRedo,
    syncCodeToEditor,
    syncEditorToCode,
    sanitizeHtml,
  };
}
