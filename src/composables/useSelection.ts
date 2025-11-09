import { ref, type Ref } from "vue";
import {
  saveSelection as saveSelectionUtil,
  restoreSelection,
} from "../utils/formatting";

export function useSelection(editorContent: Ref<HTMLElement | null>) {
  const savedRange = ref<Range | null>(null);

  const saveSelection = () => {
    return saveSelectionUtil();
  };

  const rememberSelection = () => {
    savedRange.value = saveSelection();
  };

  const createFallbackSelection = (root: HTMLElement) => {
    const selection = globalThis.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false); // Collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const performWithSelection = (
    action: (root: HTMLElement) => void,
    afterAction?: () => void
  ) => {
    const root = editorContent.value;
    if (!root) return;

    // Check if there's currently a selection in the editor
    const currentSelection = globalThis.getSelection();
    const hasActiveSelection =
      currentSelection &&
      currentSelection.rangeCount > 0 &&
      !currentSelection.isCollapsed &&
      root.contains(currentSelection.anchorNode);

    // If there's an active selection in the editor, use it (don't restore saved)
    // Otherwise, try to restore the saved selection
    if (!hasActiveSelection && savedRange.value) {
      try {
        // Verify the range is still valid and within the editor
        if (
          savedRange.value.startContainer &&
          root.contains(savedRange.value.startContainer)
        ) {
          restoreSelection(savedRange.value);
        } else {
          // If saved range is invalid, focus the editor at the end
          root.focus();
          createFallbackSelection(root);
        }
      } catch (error) {
        console.warn(
          "Failed to restore saved selection, falling back to end of editor",
          error
        );
        root.focus();
        createFallbackSelection(root);
      }
    } else if (hasActiveSelection) {
      // There's an active selection, just ensure editor has focus
      root.focus();
    } else {
      // No saved selection and no active selection, place cursor at end
      root.focus();
      createFallbackSelection(root);
    }

    try {
      action(root);
    } catch (error) {
      console.warn("Formatting action failed", error);
    }

    // Save the new selection state after the action
    savedRange.value = saveSelection();

    // Execute after action callback if provided
    if (afterAction) {
      afterAction();
    }
  };

  return {
    saveSelection,
    rememberSelection,
    performWithSelection,
  };
}
