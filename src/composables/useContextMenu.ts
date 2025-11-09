import { ref, computed, type Ref } from "vue";
import type { ContextMenuItem } from "../types/contextMenu";
import { getSelectedTable, getSelectedCell } from "../utils/commands";

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
          // Modern approach: Use Clipboard API + Selection API
          if (navigator.clipboard && globalThis.getSelection) {
            try {
              const text = selection?.toString() ?? "";
              await navigator.clipboard.writeText(text);

              // Delete the selected content using modern Selection API
              const sel = globalThis.getSelection();
              if (sel && sel.rangeCount > 0) {
                sel.deleteFromDocument();
              }
              return;
            } catch (error) {
              console.warn(
                "Modern clipboard API failed, trying fallback:",
                error
              );
            }
          }

          // Fallback for older browsers
          try {
            // @ts-ignore - execCommand is deprecated but needed for legacy browser support
            document.execCommand("cut");
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
          // Modern approach: Use Clipboard API
          if (navigator.clipboard) {
            try {
              const text = selection?.toString() ?? "";
              await navigator.clipboard.writeText(text);
              return;
            } catch (error) {
              console.warn(
                "Modern clipboard API failed, trying fallback:",
                error
              );
            }
          }

          // Fallback for older browsers
          try {
            // @ts-ignore - execCommand is deprecated but needed for legacy browser support
            document.execCommand("copy");
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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick: async () => {
          // Modern approach: Use Clipboard API
          if (navigator.clipboard?.readText) {
            try {
              const text = await navigator.clipboard.readText();

              // Insert text at current position using modern Selection API
              const sel = globalThis.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));

                // Move cursor to end of inserted text
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
              }
              return;
            } catch (error) {
              console.warn(
                "Modern clipboard API failed, trying fallback:",
                error
              );
            }
          }

          // Fallback for older browsers
          try {
            // @ts-ignore - execCommand is deprecated but needed for legacy browser support
            document.execCommand("paste");
          } catch (error) {
            console.error(
              "Paste operation failed. Clipboard permissions may be required.",
              error
            );
          }
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

      if (table && cell) {
        currentTable.value = table;
        currentCell.value = cell;

        // Position the designer at the mouse cursor
        const editorRect = editorContent.value?.getBoundingClientRect();
        if (editorRect) {
          tableDesignerPosition.value = {
            x: event.clientX - editorRect.left,
            y: event.clientY - editorRect.top,
          };
          showTableDesigner.value = true;
        }
      }
      return;
    }

    // Save the current selection before showing the context menu
    rememberSelection();

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
