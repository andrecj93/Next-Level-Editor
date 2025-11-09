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
  tableDesignerPosition,
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
      currentTable.value = table;
      currentCell.value = cell;

      // Position the designer near the table
      const rect = table.getBoundingClientRect();
      const editorRect = editorContent.value?.getBoundingClientRect();

      if (editorRect) {
        tableDesignerPosition.value = {
          x: rect.right - editorRect.left + 10,
          y: rect.top - editorRect.top,
        };
        showTableDesigner.value = true;
      }
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
