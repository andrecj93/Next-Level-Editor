import { ref, computed, type Ref } from "vue";
import type { ToolbarAction } from "../types/toolbar";

// Cohesive stroke glyphs shared with the main toolbar (Lucide geometry: 24
// viewBox, stroke-2, round caps). Rendered via v-html inside the dark bubble;
// `currentColor` picks up the button's light text automatically.
const svg = (paths: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const FLOATING_ICONS = {
  bold: svg('<path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/>'),
  italic: svg('<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>'),
  underline: svg('<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="21" y2="21"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  comment: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
} as const;

export interface UseFloatingToolbarOptions {
  handleInlineAction: (tag: string) => void;
  isInlineActionActive: (tag: string) => boolean;
  insertLink: () => void;
  isAddingComment?: Ref<boolean>;
  onAddComment?: () => void;
  enableComments?: boolean;
  /**
   * The root element of THIS editor instance. The selection toolbar (the
   * bubble over selected text) must only appear for selections inside its own
   * editor: every instance listens to the document-level `selectionchange`,
   * so without this ownership check a page with several editors (e.g. the
   * demo home page) shows one stacked bubble per instance for a single
   * selection.
   */
  editorRoot?: Ref<HTMLElement | null>;
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

    // Ownership: only react to selections inside THIS editor instance.
    // selectionchange is document-global, so without this check every mounted
    // editor shows its own bubble for the same selection (stacked duplicates
    // on multi-editor pages), and selections outside any editor trigger all
    // of them.
    if (options?.editorRoot) {
      const root = options.editorRoot.value;
      const anchor = selection?.anchorNode ?? null;
      const focus = selection?.focusNode ?? null;
      if (
        !root ||
        !anchor ||
        !focus ||
        !root.contains(anchor) ||
        !root.contains(focus)
      ) {
        showFloatingToolbar.value = false;
        return;
      }
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
            icon: FLOATING_ICONS.bold,
            tooltip: "Bold (Ctrl+B)",
            onClick: () => options.handleInlineAction("strong"),
            isActive: () => options.isInlineActionActive("strong"),
          },
          {
            id: "italic",
            label: "Italic",
            icon: FLOATING_ICONS.italic,
            tooltip: "Italic (Ctrl+I)",
            onClick: () => options.handleInlineAction("em"),
            isActive: () => options.isInlineActionActive("em"),
          },
          {
            id: "underline",
            label: "Underline",
            icon: FLOATING_ICONS.underline,
            tooltip: "Underline (Ctrl+U)",
            onClick: () => options.handleInlineAction("u"),
            isActive: () => options.isInlineActionActive("u"),
          },
          {
            id: "link",
            label: "Link",
            icon: FLOATING_ICONS.link,
            tooltip: "Insert link",
            onClick: options.insertLink,
          },
        ];

        // Add comment button if comments are enabled
        if (options.enableComments && options.onAddComment) {
          actions.push({
            id: "comment",
            label: "Comment",
            icon: FLOATING_ICONS.comment,
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
