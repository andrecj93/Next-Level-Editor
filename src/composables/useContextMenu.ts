import { ref, computed, type Ref } from "vue";
import type { ContextMenuItem } from "../types/contextMenu";
import { getSelectedTable, getSelectedCell } from "../utils/commands";
import {
  copyToClipboard,
  copyHtmlToClipboard,
  readClipboard,
} from "../utils/clipboard";

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
  /**
   * Capture an undo/redo snapshot after a mutating action (e.g. cut/paste).
   * Optional so callers that only need the read-only menu keep working.
   */
  captureSnapshot?: () => void;
  /**
   * Emit the current editor content to the parent after a mutating action so
   * the change is persisted (v-model / auto-save). Optional for the same
   * reason as captureSnapshot.
   */
  emitUpdate?: (html: string) => void;
}

/**
 * Approximate size used to clamp the menu inside the viewport before it is
 * actually measured. The menu has a min-width of 200px and a handful of rows;
 * these are safe upper bounds so the menu never opens off-screen.
 */
const ESTIMATED_MENU_WIDTH = 220;
const ESTIMATED_MENU_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;

/**
 * Serialize the current selection to an HTML string, preserving inline
 * formatting (bold/italic/links/etc.) rather than flattening to plain text.
 */
function getSelectionHtml(selection: Selection): string {
  if (selection.rangeCount === 0) return "";
  const container = document.createElement("div");
  for (let i = 0; i < selection.rangeCount; i++) {
    container.appendChild(selection.getRangeAt(i).cloneContents());
  }
  return container.innerHTML;
}

/**
 * Clamp a desired {x, y} menu origin so the whole menu stays within the
 * viewport, accounting for its (estimated or measured) size.
 */
function clampToViewport(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number
): { left: number; top: number } {
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : menuWidth;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : menuHeight;

  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    viewportWidth - menuWidth - VIEWPORT_MARGIN
  );
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    viewportHeight - menuHeight - VIEWPORT_MARGIN
  );

  return {
    left: Math.min(Math.max(x, VIEWPORT_MARGIN), maxLeft),
    top: Math.min(Math.max(y, VIEWPORT_MARGIN), maxTop),
  };
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
    captureSnapshot,
    emitUpdate,
  } = options;

  /**
   * Persist a mutating change (cut/paste): snapshot for undo and emit the new
   * editor content so v-model / auto-save observe it. Both callbacks are
   * optional; each is invoked only when supplied.
   */
  const commitContentChange = () => {
    captureSnapshot?.();
    if (emitUpdate) {
      emitUpdate(editorContent.value?.innerHTML ?? "");
    }
  };

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

    // #28: programmatic paste requires the async Clipboard read API, which is
    // only available in secure contexts on Chromium browsers.
    const pasteSupported = Boolean(navigator.clipboard?.readText);

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
            // #13: preserve formatting by copying HTML (falls back to text
            // when the ClipboardItem API is unavailable).
            const html = getSelectionHtml(sel);

            // Copy to clipboard first
            const copied = html
              ? await copyHtmlToClipboard(html, text)
              : await copyToClipboard(text);

            if (copied) {
              // Delete the selected content using Selection API
              sel.deleteFromDocument();
              // #14: capture an undo snapshot and emit the content change so
              // the cut is recorded in history and persisted to the parent.
              commitContentChange();
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
            // #13: copy the HTML of the selection so formatting survives the
            // round-trip, falling back to plain text where HTML is empty.
            const html = getSelectionHtml(sel);
            if (html) {
              await copyHtmlToClipboard(html, text);
            } else {
              await copyToClipboard(text);
            }
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
        // #28: enable paste when the async Clipboard read API is available
        // (Chrome/Edge). Where it is not (Safari/Firefox), keep it disabled -
        // those browsers require a real paste event (Ctrl+V/Cmd+V).
        disabled: !pasteSupported,
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick: async () => {
          if (!pasteSupported) return;

          try {
            const text = await readClipboard();
            if (text === null) {
              // Read denied or empty: surface guidance without mutating.
              console.warn(
                "Clipboard read unavailable. Use Ctrl+V/Cmd+V to paste."
              );
              return;
            }

            const sel = globalThis.getSelection();
            if (!sel || sel.rangeCount === 0) return;

            const range = sel.getRangeAt(0);
            range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node);

            // Move the caret after the inserted text.
            range.setStartAfter(node);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);

            commitContentChange();
          } catch (error) {
            console.error("Paste operation failed:", error);
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
    // #30: clamp the origin to the viewport so the menu never opens off-screen
    // near the right/bottom edges. Uses conservative size estimates; the menu
    // is small and fixed-positioned so this keeps it fully visible.
    contextMenuPosition.value = clampToViewport(
      event.clientX,
      event.clientY,
      ESTIMATED_MENU_WIDTH,
      ESTIMATED_MENU_HEIGHT
    );
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
