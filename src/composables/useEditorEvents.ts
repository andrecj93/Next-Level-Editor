import { type Ref, nextTick } from "vue";
import { getSelectedTable, getSelectedCell } from "../utils/commands";
import { initializeEmbeddedElements } from "../utils/embeddedResizable";

/**
 * Keystroke-burst kinds by the input event's inputType. Typing and deleting
 * runs coalesce into one undo step each (r13 #12); anything else — Enter,
 * paste, formatting, synthetic input events (which carry no inputType), and
 * notably insertReplacementText (accepting an AUTOCORRECTION, which platform
 * convention keeps as its own undo step so one Ctrl+Z rejects just the
 * correction — #r15-14) — is an undo boundary.
 */
const COALESCE_BY_INPUT_TYPE: Record<string, "typing" | "deleting"> = {
  insertText: "typing",
  deleteContentBackward: "deleting",
  deleteContentForward: "deleting",
};

/** The history coalesce key an input event implies, if any. Shared by every
 *  editing surface (main + split pane) so bursts coalesce identically. */
export const coalesceKeyForInputEvent = (
  event?: Event
): "typing" | "deleting" | undefined => {
  const inputType = (event as InputEvent | undefined)?.inputType;
  return inputType ? COALESCE_BY_INPUT_TYPE[inputType] : undefined;
};

interface UseEditorEventsParams {
  editorContent: Ref<HTMLDivElement | null>;
  codeContent: Ref<string>;
  htmlContent: Ref<string>;
  /** Sanitizer — code-view HTML must be cleaned before it re-enters the DOM
   *  or is emitted to the host's v-model (otherwise Code view is a stored-XSS
   *  hole that bypasses the paste sanitizer). */
  sanitizeHtml: (html: string) => string;
  captureSnapshot: (
    shouldEmit?: boolean,
    coalesceKey?: "typing" | "deleting"
  ) => void;
  updateFloatingToolbar: () => void;
  updateToolbarContext: (element: HTMLElement) => void;
  rememberSelection: () => void;
  showFloatingToolbar: Ref<boolean>;
  showTableDesigner: Ref<boolean>;
  currentTable: Ref<HTMLTableElement | null>;
  currentCell: Ref<HTMLTableCellElement | null>;
  tableDesignerPosition: Ref<{ x: number; y: number }>;
  emit: any;
}

export function useEditorEvents({
  editorContent,
  codeContent,
  htmlContent,
  sanitizeHtml,
  captureSnapshot,
  updateFloatingToolbar,
  updateToolbarContext,
  rememberSelection,
  showFloatingToolbar,
  showTableDesigner,
  currentTable,
  currentCell,
  emit,
}: UseEditorEventsParams) {
  /**
   * Handle input event in the WYSIWYG editor
   */
  const onInput = (event?: Event) => {
    captureSnapshot(true, coalesceKeyForInputEvent(event));
    updateFloatingToolbar();
  };

  /**
   * Handle focus event
   */
  const onFocus = () => {
    rememberSelection();
    emit("focus");
  };

  /**
   * Handle blur event with delayed floating toolbar hiding
   */
  const onBlur = () => {
    // Save the selection before losing focus
    rememberSelection();
    // Delay hiding floating toolbar to allow clicks
    setTimeout(() => {
      // Search can focus the manuscript briefly to select a match, then return
      // to its input. A pending blur must not hide a newly restored toolbar
      // after Escape has already put the writer back in the manuscript.
      const root = editorContent.value;
      if (!root?.contains(root.ownerDocument.activeElement)) showFloatingToolbar.value = false;
    }, 200);
    emit("blur");
  };

  /**
   * Handle mouse up event to update floating toolbar and check table selection
   */
  const onMouseUp = () => {
    updateFloatingToolbar();
    checkForTableSelection();
  };

  /**
   * Check if a table cell is selected and show table designer
   */
  const checkForTableSelection = () => {
    const table = getSelectedTable();
    const cell = getSelectedCell();

    if (table && cell) {
      // Track the active table/cell so table operations know their target, but
      // do NOT auto-open the TableDesigner here. Opening it on every left-click
      // in a cell popped the panel unprompted and fought the right-click
      // positioning; it now opens only on an explicit right-click (handled in
      // useContextMenu). [#12]
      currentTable.value = table;
      currentCell.value = cell;
    } else {
      showTableDesigner.value = false;
      currentTable.value = null;
      currentCell.value = null;
    }
  };

  /**
   * Handle selection change event to update toolbar states
   */
  const onSelectionChange = () => {
    updateFloatingToolbar();
    checkForTableSelection();

    // Update smart toolbar context
    nextTick(() => {
      if (editorContent.value) {
        updateToolbarContext(editorContent.value);
      }
    });
  };

  /**
   * Handle input event in the code editor (textarea)
   */
  const onCodeInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    // Keep the textarea's own value RAW so the user sees exactly what they
    // type; but sanitize before it re-enters the live DOM / model.
    codeContent.value = target.value;

    // Update the hidden WYSIWYG editor with the SANITIZED HTML — writing the
    // raw value would execute inline handlers (e.g. <img onerror>) in the
    // editor's own page.
    if (editorContent.value) {
      const clean = sanitizeHtml(target.value);
      editorContent.value.innerHTML = clean;
      htmlContent.value = clean;
      // The write replaces every node, so embeds are new instances with no
      // interactivity bound. Matters most in split view, where this surface is
      // the LIVE editor. WeakSet-keyed, so already-bound nodes can't double-bind.
      initializeEmbeddedElements(editorContent.value);
    }

    // Capture snapshot for undo/redo functionality in code view
    captureSnapshot();
  };

  /**
   * Handle blur event in the code editor to sync content
   */
  const onCodeBlur = () => {
    // Sync code content to editor when leaving code view — sanitized, so Code
    // view can never emit raw HTML to the host's v-model (stored XSS).
    if (editorContent.value && codeContent.value) {
      const clean = sanitizeHtml(codeContent.value);
      editorContent.value.innerHTML = clean;
      htmlContent.value = clean;
      initializeEmbeddedElements(editorContent.value);
      emit("update:modelValue", clean);
    }
  };

  return {
    onInput,
    onFocus,
    onBlur,
    onMouseUp,
    onSelectionChange,
    onCodeInput,
    onCodeBlur,
  };
}
