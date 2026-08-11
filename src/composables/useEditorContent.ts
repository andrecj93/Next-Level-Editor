import { ref, watch, nextTick, type Ref } from "vue";
import { useHtmlSanitizer } from "./useHtmlSanitizer";
import {
  useEditorHistory,
  type HistoryCoalesceKey,
} from "./useEditorHistory";
import { initializeEmbeddedElements } from "../utils/embeddedResizable";
import {
  getCaretOffsets,
  setCaretOffsets,
  type CaretOffsets,
} from "../utils/caretOffset";

interface UseEditorContentOptions {
  editorContent: Ref<HTMLDivElement | null>;
  modelValue: Ref<string>;
  onUpdate: (value: string) => void;
  triggerAutoSave?: (content: string) => void;
  /**
   * Called after the editor's innerHTML has been replaced wholesale, for
   * subsystems that bind listeners to live nodes and must re-attach them.
   * Embeds are handled here directly; comments hook in through this.
   */
  onContentReplaced?: () => void;
}

/**
 * Composable for managing editor content, sanitization, and synchronization
 * Handles content validation, history tracking, and model updates
 */
export function useEditorContent(options: UseEditorContentOptions) {
  const { editorContent, modelValue, onUpdate, triggerAutoSave } = options;
  const notifyContentReplaced = () => options.onContentReplaced?.();
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
      // Replacing innerHTML destroys the live selection and drops the caret to
      // the top of the document. When the selection is inside this editor (the
      // user is typing and the host echoed a transformed modelValue back),
      // preserve it across the rewrite — the same mechanism undo/redo uses.
      // getCaretOffsets returns null when the selection is elsewhere, making
      // the restore a no-op for external/idle updates.
      const caret = getCaretOffsets(editorContent.value);
      editorContent.value.innerHTML = sanitized;
      if (caret) {
        setCaretOffsets(editorContent.value, caret);
      }
    }
    htmlContent.value = sanitized;
    reinitEmbeds();
    notifyContentReplaced();
  };

  /**
   * Capture a history snapshot and emit update.
   * @param coalesceKey - keystroke-burst kind (from the input event's
   *   inputType); same-kind captures within the burst window merge into one
   *   undo step. Omitted for everything that must be its own undo boundary.
   */
  // Raw→sanitized memo of the last emit. The htmlContent autosave watcher
  // below fires with the RAW innerHTML right after captureAndEmit armed the
  // debounce with the SANITIZED string; the raw call used to win the debounce,
  // so a controlled host saw modelValue shape-shift to unsanitized browser
  // markup (<div>/<font>) two seconds after every typing pause. The memo lets
  // the watcher reuse the sanitized form without a second full-document pass.
  let lastEmit: { raw: string; sanitized: string } | null = null;

  const captureAndEmit = (
    emitUpdate = true,
    coalesceKey?: HistoryCoalesceKey
  ) => {
    if (!editorContent.value || isApplyingHistory.value) return;

    const html = editorContent.value.innerHTML;
    htmlContent.value = html;

    // Record the caret alongside the snapshot so undo/redo can restore it
    // instead of dropping the cursor to the top of the document.
    captureSnapshot(html, getCaretOffsets(editorContent.value), coalesceKey);

    if (emitUpdate) {
      const sanitized = sanitizeHtml(html);
      lastEmit = { raw: html, sanitized };
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
  const applyRestoredSnapshot = (
    html: string,
    selection?: CaretOffsets | null
  ) => {
    if (editorContent.value) {
      editorContent.value.innerHTML = html;
    }
    htmlContent.value = html;
    codeContent.value = html;
    const sanitized = sanitizeHtml(html);
    onUpdate(sanitized);
    // Re-arm auto-save with the RESTORED content. Typing arms the debounced
    // save with the then-current string captured in its timer closure; the
    // htmlContent watcher is skipped while isApplyingHistory is true, so an
    // undo within the debounce window left that stale timer live — ~2s after
    // a successful undo it re-emitted the PRE-undo content, visibly reverting
    // the undo (or persisting the stale snapshot through the host's
    // saveHandler). triggerAutoSave debounces, so this call supersedes it.
    if (triggerAutoSave) {
      triggerAutoSave(sanitized);
    }
    reinitEmbeds();
    notifyContentReplaced();
    // Put the caret back where it was when this state was captured. Done last,
    // after embeds/comments re-bind, so the restored text nodes are stable.
    if (editorContent.value && selection) {
      setCaretOffsets(editorContent.value, selection);
    }
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

  // True only for the `immediate` run below, which fires during SETUP —
  // before any surface exists and before the autosave watcher is registered.
  let preMountSync = true;

  // Watch for external model value changes
  watch(
    modelValue,
    (newValue) => {
      if (isApplyingHistory.value) return;
      if (!editorContent.value) {
        // No editable surface mounted (Preview view, including a DIRECT mount
        // via defaultViewMode="preview"): the string is still the document —
        // it drives the v-html pane, exports and print. Bailing here left
        // htmlContent empty and the preview showed its typing placeholder
        // over a non-empty modelValue. #R25-18
        if (preMountSync) {
          // The immediate run fires during SETUP, when the surface is null in
          // EVERY mount — the autosave watcher doesn't exist yet, and raising
          // isApplyingHistory here would still be up during onMounted and
          // swallow the pristine history baseline.
          htmlContent.value = sanitizeHtml(newValue);
          return;
        }
        // A LATER surface-less update (Preview receiving a host modelValue):
        // shielded — receiving an update is not an edit, and the autosave
        // watcher must not save (and re-emit) it back. #R26-2
        isApplyingHistory.value = true;
        htmlContent.value = sanitizeHtml(newValue);
        nextTick(() => {
          isApplyingHistory.value = false;
        });
        return;
      }

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
  // The immediate call above has returned; every later run is post-setup.
  preMountSync = false;

  // Watch for content changes and trigger auto-save. Autosave must always be
  // armed with the SANITIZED serialization — this watcher fires with raw
  // innerHTML strings (htmlContent mirrors the DOM), and the raw string used
  // to win the debounce over captureAndEmit's sanitized call.
  if (triggerAutoSave) {
    watch(htmlContent, (newContent) => {
      if (newContent && !isApplyingHistory.value) {
        const sanitized =
          lastEmit && lastEmit.raw === newContent
            ? lastEmit.sanitized
            : sanitizeHtml(newContent);
        triggerAutoSave(sanitized);
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
