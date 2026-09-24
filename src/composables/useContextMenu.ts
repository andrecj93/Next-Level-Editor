import { ref, computed, type Ref } from "vue";
import type { ContextMenuItem } from "../types/contextMenu";
import { useClipboardCut } from './useClipboardCut';
import { serializeEditorSelection } from '../utils/selectionClipboard';
import { rangeCapturesContent } from '../utils/rangeContact';
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
  /** Use the editor's complete paste pipeline when the menu belongs to it. */
  pasteClipboard?: () => Promise<void>;
  /** Host editing-mode/readonly guard, rechecked before a delayed mutation. */
  canEdit?: () => boolean;
  beforeCut?: () => void;
  notify?: (message: string) => void;
  clearNotification?: (message: string) => void;
}

/**
 * Approximate size used to clamp the menu inside the viewport before it is
 * actually measured. The menu has a min-width of 200px and a handful of rows;
 * these are safe upper bounds so the menu never opens off-screen.
 */
const ESTIMATED_MENU_WIDTH = 220;
const ESTIMATED_MENU_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;

// Keep UTF-16 offsets for DOM ranges while recognizing complete Unicode words.
// The library's ES2020 types do not yet declare Intl.Segmenter.
interface WordSegment { index: number; segment: string; isWordLike?: boolean }
type WordSegmenter = new (locale: undefined, options: { granularity: 'word' }) => {
  segment(text: string): { containing(offset: number): WordSegment | undefined };
};
function wordAtOffset(text: string, offset: number): { start: number; end: number } | null {
  const Segmenter = (Intl as unknown as { Segmenter?: WordSegmenter }).Segmenter;
  if (typeof Segmenter === 'function') {
    const segments = new Segmenter(undefined, { granularity: 'word' }).segment(text);
    // Some Firefox/ICU builds segment CJK correctly but mark it non-word-like.
    const isWord = (part: WordSegment | undefined): part is WordSegment =>
      Boolean(part && (part.isWordLike || /[\p{L}\p{N}_]/u.test(part.segment)));
    let word = segments.containing(offset);
    // Hit testing may return the trailing edge of the letter under the pointer.
    if (!isWord(word) && offset > 0) {
      const previous = segments.containing(offset - 1);
      if (isWord(previous) && previous.index + previous.segment.length === offset) word = previous;
    }
    return isWord(word) ? { start: word.index, end: word.index + word.segment.length } : null;
  }
  // Older engines still support accents, combining marks and astral letters.
  const words = /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*/gu;
  let word: RegExpExecArray | null;
  while ((word = words.exec(text))) {
    const end = word.index + word[0].length;
    if (offset >= word.index && offset <= end) return { start: word.index, end };
  }
  return null;
}

/**
 * When the selection is collapsed, select the word under the given pointer
 * position so a right-click formatting action targets the clicked word (like
 * native editors). An existing non-empty selection is left untouched.
 */
function selectWordUnderPointer(event: MouseEvent, root: HTMLElement | null): void {
  const selection = globalThis.getSelection?.();
  if (!selection) return;
  if (!selection.isCollapsed && root && Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i))
    .some(range => root.contains(range.startContainer) && root.contains(range.endContainer) && rangeCapturesContent(range))) return;

  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };

  let range: Range | null = null;
  if (typeof doc.caretRangeFromPoint === "function") {
    range = doc.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(event.clientX, event.clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }
  if (!range || !root?.contains(range.startContainer)) return;

  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    const word = wordAtOffset(text, range.startOffset);
    if (word) {
      const wordRange = document.createRange();
      wordRange.setStart(node, word.start);
      wordRange.setEnd(node, word.end);
      selection.removeAllRanges();
      selection.addRange(wordRange);
      return;
    }
  }

  // No word to expand to: at least place the caret where the user clicked.
  selection.removeAllRanges();
  selection.addRange(range);
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
    pasteClipboard,
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

  const canEdit = () => Boolean(editorContent.value
    && editorContent.value.getAttribute('contenteditable') !== 'false'
    && (options.canEdit?.() ?? true));
  const cutSelection = useClipboardCut({
    editorContent, canEdit, beforeCut: options.beforeCut, commit: commitContentChange,
    notify: options.notify, clearNotification: options.clearNotification,
  });

  const showContextMenu = ref(false);
  const contextMenuPosition = ref({ top: 0, left: 0 });

  // Whether there is a usable text selection, captured reactively when the menu
  // opens. The computed below reads the live DOM selection which is not a Vue
  // dependency, so without this ref the disabled states would be cached from an
  // earlier evaluation and mis-gate (e.g. Bold stays disabled even after the
  // right-click selected the word under the pointer). [#15]
  const selectionActive = ref(false);

  const computeSelectionActive = (): boolean => {
    const selection = globalThis.getSelection();
    const root = editorContent.value;
    return Boolean(selection && root && !selection.isCollapsed &&
      Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i))
        .some(range => root.contains(range.startContainer) && root.contains(range.endContainer) && rangeCapturesContent(range)));
  };

  // The element that was right-clicked, so the menu can offer target-specific
  // actions (link / image). Captured in handleContextMenu. [#10]
  const contextTargetLink = ref<HTMLAnchorElement | null>(null);
  const contextTargetImage = ref<HTMLImageElement | null>(null);

  /**
   * Context menu items based on current selection
   */
  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const hasSelection = selectionActive.value;

    // Programmatic paste requires a supported async Clipboard read API.
    // `typeof` guard, not `navigator?.`: this computed is EVALUATED DURING THE
    // SSR RENDER, and `navigator` is not a global in Node before v21, so a
    // bare reference throws ReferenceError (optional chaining does not help —
    // the identifier itself is undeclared) and fails the whole server render
    // on Node 20 LTS. #R32-10
    const pasteSupported =
      typeof navigator !== "undefined" &&
      Boolean(navigator.clipboard?.readText || (pasteClipboard && navigator.clipboard?.read));

    const items: ContextMenuItem[] = [
      {
        id: "cut",
        label: "Cut",
        icon: "✂️",
        shortcut: "Ctrl+X",
        disabled: !hasSelection,
         
        onClick: cutSelection,
      },
      {
        id: "copy",
        label: "Copy",
        icon: "📋",
        shortcut: "Ctrl+C",
        disabled: !hasSelection,
         
        onClick: async () => {
          const sel = globalThis.getSelection();
          const root = editorContent.value;
          if (!root || !sel || sel.rangeCount === 0) return;

          try {
            const data = serializeEditorSelection(sel, root);
            if (!data) return;
            const { text, html } = data;
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
        // Older browsers without an async read API still need keyboard paste.
        disabled: !pasteSupported,
         
        onClick: async () => {
          if (!pasteSupported) return;
          if (pasteClipboard) {
            await pasteClipboard();
            return;
          }

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

    // Target-specific actions for a right-clicked link. [#10]
    const link = contextTargetLink.value;
    if (link) {
      items.push(
        { divider: true },
        {
          id: "open-link",
          label: "Open Link",
          icon: "↗️",
          onClick: () => {
            window.open(link.href, "_blank", "noopener,noreferrer");
          },
        },
        {
          id: "copy-link",
          label: "Copy Link Address",
          icon: "🔗",
          onClick: () => {
            void navigator.clipboard?.writeText(link.href);
          },
        },
        {
          id: "remove-link",
          label: "Remove Link",
          icon: "⛔",
          onClick: () => {
            const parent = link.parentNode;
            if (!parent) return;
            while (link.firstChild) {
              parent.insertBefore(link.firstChild, link);
            }
            parent.removeChild(link);
            commitContentChange();
          },
        }
      );
    }

    // Target-specific actions for a right-clicked image. [#10]
    const image = contextTargetImage.value;
    if (image) {
      items.push(
        { divider: true },
        {
          id: "remove-image",
          label: "Remove Image",
          icon: "🗑️",
          onClick: () => {
            image.remove();
            commitContentChange();
          },
        }
      );
    }

    const editable = canEdit();
    return items.map(item => {
      if (item.divider || ['copy', 'open-link', 'copy-link'].includes(item.id ?? '')) return item;
      const action = item.onClick;
      return { ...item, disabled: item.disabled || !editable, onClick: () => { if (canEdit()) return action?.(); } };
    });
  });

  /**
   * Handle right-click context menu
   */
  const handleContextMenu = (event: MouseEvent) => {
    // Retain native spelling/clipboard tools for touch long-press and provide
    // the same Shift+right-click escape hatch Firefox offers by default.
    if (event.shiftKey || ('pointerType' in event && event.pointerType === 'touch')) {
      showContextMenu.value = false;
      showTableDesigner.value = false;
      return;
    }
    event.preventDefault();

    // Resolve the right-clicked link/image so the menu can offer target-specific
    // actions (Open/Copy/Remove Link, Remove Image). [#10]
    const targetEl =
      event.target instanceof Element
        ? event.target
        : (event.target as Node | null)?.parentElement ?? null;
    contextTargetLink.value = targetEl?.closest("a") ?? null;
    contextTargetImage.value =
      targetEl?.tagName === "IMG" ? (targetEl as HTMLImageElement) : null;

    // Check if the right-click is on a table element
    const target = event.target;
    if (canEdit() && target instanceof Element && target.closest("table, td, th")) {
      // Show the TableDesigner at the cursor position for table-specific actions
      const table = getSelectedTable();
      const cell = getSelectedCell();
      // The designer is position:absolute inside `.next-level-editor` (its
      // containing block), NOT `.editor-content` — which is a CENTERED column
      // inset from the container. Position against the container, or the menu
      // renders ~half-the-margin left of the cell the user clicked.
      const container =
        editorContent.value?.closest<HTMLElement>(".next-level-editor") ??
        editorContent.value;
      const editorRect = container?.getBoundingClientRect();

      // Only show the table designer when we can fully resolve the table
      // context (table, cell and editor bounds). Otherwise fall through to the
      // regular context menu so the right-click is not swallowed by both.
      if (table && cell && editorRect) {
        currentTable.value = table;
        currentCell.value = cell;

        // Position the designer at the cursor, clamped so the tall menu (~10
        // buttons) is never pushed past the container's edges — the container
        // has overflow:hidden, which would otherwise clip Delete/Properties.
        const MENU_W = 260;
        const MENU_H = 420;
        const MARGIN = 8;
        const rawX = event.clientX - editorRect.left;
        const rawY = event.clientY - editorRect.top;
        tableDesignerPosition.value = {
          x: Math.max(
            MARGIN,
            Math.min(rawX, editorRect.width - MENU_W - MARGIN)
          ),
          y: Math.max(
            MARGIN,
            Math.min(rawY, editorRect.height - MENU_H - MARGIN)
          ),
        };
        // Ensure the two menus never fight: the table designer wins here,
        // so the generic context menu stays hidden.
        showContextMenu.value = false;
        showTableDesigner.value = true;
        return;
      }
      // Table context could not be resolved: fall through to the context menu.
    }

    // If nothing is selected, select the word under the pointer so that
    // formatting items (Bold/Italic/Underline) act on what the user actually
    // right-clicked, matching native editors. An existing non-empty selection
    // is left untouched. [#15]
    selectWordUnderPointer(event, editorContent.value);

    // Capture the selection state now so the menu's disabled gating reflects
    // what is actually selected at open time (see selectionActive). [#15]
    selectionActive.value = computeSelectionActive();

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
