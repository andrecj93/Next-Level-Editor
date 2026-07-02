import { ref, computed, type Ref } from "vue";
import type { ContextMenuItem } from "../types/contextMenu";
import { getSelectedTable, getSelectedCell } from "../utils/commands";
import { copyToClipboard } from "../utils/clipboard";

interface ContextMenuOptions {
  editorContent: Ref<HTMLElement | null>;
  handleInlineAction: (tag: string) => void;
  insertLink: () => void;
  insertImage: () => void;
  rememberSelection: () => void;
  showTableDesigner: Ref<boolean>;
  currentTable: Ref<HTMLTableElement | null>;
  currentCell: Ref<HTMLTableCellElement | null>;
  tableDesignerPosition: Ref<{ x: number; y: number }>;
}

/**
 * Composable for handling context menu functionality
 * Provides context menu items, positioning, and event handling
 */
export function useContextMenu(options: ContextMenuOptions) {
  const {
    editorContent,
    handleInlineAction,
    insertLink,
    insertImage,
    rememberSelection,
    showTableDesigner,
    currentTable,
    currentCell,
    tableDesignerPosition,
  } = options;

  const showContextMenu = ref(false);
  const contextMenuPosition = ref({ top: 0, left: 0 });

  /**
   * Context menu items based on current selection
   */
  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const selection = globalThis.getSelection();
    const hasSelection =
      selection &&
      !selection.isCollapsed &&
      selection.toString().trim().length > 0;

    return [
      {
        id: "cut",
        label: "Cut",
        icon: "✂️",
        shortcut: "Ctrl+X",
        disabled: !hasSelection,
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick: async () => {
          const sel = globalThis.getSelection();
          if (!sel || sel.rangeCount === 0) return;

          try {
            const text = sel.toString();

            // Copy to clipboard first
            const copied = await copyToClipboard(text);

            if (copied) {
              // Delete the selected content using Selection API
              sel.deleteFromDocument();
            }
          } catch (error) {
            console.error("Cut operation failed:", error);
          }
        },
      },
      {
        id: "copy",
        label: "Copy",
        icon: "📋",
        shortcut: "Ctrl+C",
        disabled: !hasSelection,
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick: async () => {
          const sel = globalThis.getSelection();
          if (!sel || sel.rangeCount === 0) return;

          try {
            const text = sel.toString();
            await copyToClipboard(text);
          } catch (error) {
            console.error("Copy operation failed:", error);
          }
        },
      },
      {
        id: "paste",
        label: "Paste",
        icon: "📄",
        shortcut: "Ctrl+V",
        disabled: true, // Paste from context menu is not reliable cross-browser, use Ctrl+V instead
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick: async () => {
          // Note: Programmatic paste is not reliable across all browsers
          // Safari iOS and Firefox require paste event from user interaction
          // Users should use Ctrl+V/Cmd+V instead
          console.warn(
            "Use Ctrl+V/Cmd+V to paste. Context menu paste is not supported on all browsers."
          );
        },
      },
      { divider: true },
      {
        id: "bold",
        label: "Bold",
        icon: "𝐁",
        shortcut: "Ctrl+B",
        disabled: !hasSelection,
        onClick: () => handleInlineAction("strong"),
      },
      {
        id: "italic",
        label: "Italic",
        icon: "𝐼",
        shortcut: "Ctrl+I",
        disabled: !hasSelection,
        onClick: () => handleInlineAction("em"),
      },
      {
        id: "underline",
        label: "Underline",
        icon: "U̲",
        shortcut: "Ctrl+U",
        disabled: !hasSelection,
        onClick: () => handleInlineAction("u"),
      },
      { divider: true },
      {
        id: "link",
        label: "Insert Link",
        icon: "🔗",
        shortcut: "Ctrl+K",
        onClick: insertLink,
      },
      {
        id: "image",
        label: "Insert Image",
        icon: "🖼️",
        onClick: insertImage,
      },
    ];
  });

  /**
   * Handle right-click context menu
   */
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();

    // Check if the right-click is on a table element
    const target = event.target;
    if (target instanceof Element && target.closest("table, td, th")) {
      // Show the TableDesigner at the cursor position for table-specific actions
      const table = getSelectedTable();
      const cell = getSelectedCell();
      const editorRect = editorContent.value?.getBoundingClientRect();

      // Only show the table designer when we can fully resolve the table
      // context (table, cell and editor bounds). Otherwise fall through to the
      // regular context menu so the right-click is not swallowed by both.
      if (table && cell && editorRect) {
        currentTable.value = table;
        currentCell.value = cell;

        // Position the designer at the mouse cursor
        tableDesignerPosition.value = {
          x: event.clientX - editorRect.left,
          y: event.clientY - editorRect.top,
        };
        // Ensure the two menus never fight: the table designer wins here,
        // so the generic context menu stays hidden.
        showContextMenu.value = false;
        showTableDesigner.value = true;
        return;
      }
      // Table context could not be resolved: fall through to the context menu.
    }

    // Save the current selection before showing the context menu
    rememberSelection();

    // Ensure only the context menu is shown (never alongside the designer).
    showTableDesigner.value = false;
    showContextMenu.value = true;
    contextMenuPosition.value = {
      top: event.clientY,
      left: event.clientX,
    };
  };

  /**
   * Close context menu
   */
  const closeContextMenu = () => {
    showContextMenu.value = false;
  };

  return {
    showContextMenu,
    contextMenuPosition,
    contextMenuItems,
    handleContextMenu,
    closeContextMenu,
  };
}
