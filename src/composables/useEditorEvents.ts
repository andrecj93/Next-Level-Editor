import { type Ref, nextTick } from "vue";
import { getSelectedTable, getSelectedCell } from "../utils/commands";

interface UseEditorEventsParams {
  editorContent: Ref<HTMLDivElement | null>;
  codeContent: Ref<string>;
  htmlContent: Ref<string>;
  captureSnapshot: (shouldEmit?: boolean) => void;
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
  const onInput = () => {
    captureSnapshot();
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
      showFloatingToolbar.value = false;
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
    codeContent.value = target.value;

    // Update the hidden WYSIWYG editor with the new HTML
    if (editorContent.value) {
      editorContent.value.innerHTML = target.value;
      htmlContent.value = target.value;
    }

    // Capture snapshot for undo/redo functionality in code view
    captureSnapshot();
  };

  /**
   * Handle blur event in the code editor to sync content
   */
  const onCodeBlur = () => {
    // Sync code content to editor when leaving code view
    if (editorContent.value && codeContent.value) {
      editorContent.value.innerHTML = codeContent.value;
      htmlContent.value = codeContent.value;
      emit("update:modelValue", codeContent.value);
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
