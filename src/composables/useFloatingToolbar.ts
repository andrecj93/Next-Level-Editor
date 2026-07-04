import { ref, computed, type Ref } from "vue";
import type { ToolbarAction } from "../types/toolbar";

export interface UseFloatingToolbarOptions {
  handleInlineAction: (tag: string) => void;
  isInlineActionActive: (tag: string) => boolean;
  insertLink: () => void;
  isAddingComment?: Ref<boolean>;
  onAddComment?: () => void;
  enableComments?: boolean;
}

/**
 * Composable for managing floating toolbar visibility and actions
 * Shows toolbar when text is selected, hides when selection is cleared
 */
export function useFloatingToolbar(options?: UseFloatingToolbarOptions) {
  const showFloatingToolbar = ref(false);
  const floatingToolbarTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  // While the user is interacting with the MAIN toolbar (e.g. a dropdown is
  // open), the selection bubble must stay hidden — any selectionchange used to
  // re-show it right on top of the open dropdown menu, intercepting clicks on
  // the menu items. Suppression is set on toolbar mousedown and lifted when
  // the user interacts with the editor surface again.
  const floatingToolbarSuppressed = ref(false);

  const suppressFloatingToolbar = () => {
    floatingToolbarSuppressed.value = true;
    showFloatingToolbar.value = false;
  };

  const unsuppressFloatingToolbar = () => {
    floatingToolbarSuppressed.value = false;
  };

  /**
   * Update floating toolbar visibility based on current selection
   */
  const updateFloatingToolbar = () => {
    // Don't show floating toolbar if user is adding a comment
    if (options?.isAddingComment?.value) {
      showFloatingToolbar.value = false;
      return;
    }

    // Suppressed while the main toolbar is being used.
    if (floatingToolbarSuppressed.value) {
      showFloatingToolbar.value = false;
      return;
    }

    const selection = globalThis.getSelection();

    // Clear any existing timer
    if (floatingToolbarTimer.value) {
      clearTimeout(floatingToolbarTimer.value);
      floatingToolbarTimer.value = null;
    }

    // Check if we have a valid text selection
    if (selection && !selection.isCollapsed) {
      const selectedText = selection.toString().trim();
      // Show toolbar immediately if there's selected text (even short selections)
      if (selectedText.length > 0) {
        showFloatingToolbar.value = true;
      } else {
        showFloatingToolbar.value = false;
      }
    } else {
      // No selection or collapsed - hide toolbar
      showFloatingToolbar.value = false;
    }
  };

  /**
   * Hide floating toolbar
   */
  const hideFloatingToolbar = () => {
    showFloatingToolbar.value = false;
  };

  /**
   * Floating toolbar actions (subset of main toolbar)
   * Only available when options are provided
   */
  const floatingActions = options
    ? computed<ToolbarAction[]>(() => {
        const actions: ToolbarAction[] = [
          {
            id: "bold",
            label: "Bold",
            icon: "<strong>B</strong>",
            tooltip: "Bold (Ctrl+B)",
            onClick: () => options.handleInlineAction("strong"),
            isActive: () => options.isInlineActionActive("strong"),
          },
          {
            id: "italic",
            label: "Italic",
            icon: "<em>I</em>",
            tooltip: "Italic (Ctrl+I)",
            onClick: () => options.handleInlineAction("em"),
            isActive: () => options.isInlineActionActive("em"),
          },
          {
            id: "underline",
            label: "Underline",
            icon: "<u>U</u>",
            tooltip: "Underline (Ctrl+U)",
            onClick: () => options.handleInlineAction("u"),
            isActive: () => options.isInlineActionActive("u"),
          },
          {
            id: "link",
            label: "Link",
            icon: "🔗",
            tooltip: "Insert link",
            onClick: options.insertLink,
          },
        ];

        // Add comment button if comments are enabled
        if (options.enableComments && options.onAddComment) {
          actions.push({
            id: "comment",
            label: "Comment",
            icon: "💬",
            tooltip: "Add comment",
            onClick: options.onAddComment,
          });
        }

        return actions;
      })
    : computed(() => []);

  return {
    showFloatingToolbar,
    floatingToolbarTimer,
    updateFloatingToolbar,
    hideFloatingToolbar,
    suppressFloatingToolbar,
    unsuppressFloatingToolbar,
    floatingActions,
  };
}
