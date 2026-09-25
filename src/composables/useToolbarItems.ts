import { computed, type Ref } from "vue";
import { indentListItem, outdentListItem } from "../utils/formatting";
import { selectionTick } from "./useActiveStates";
import type { ToolbarButton } from "../types/plugin";

/** Block-level tags that carry text alignment. */
const ALIGNABLE_BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "li",
  "blockquote",
]);

/**
 * Walk up from a node to find the nearest alignable block element within root.
 */
const getAlignableBlock = (
  node: Node | null,
  root: HTMLElement | null
): HTMLElement | null => {
  let current: Node | null = node;
  while (current && current !== root) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      ALIGNABLE_BLOCK_TAGS.has((current as HTMLElement).tagName.toLowerCase())
    ) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
};

/**
 * Resolve the effective text alignment of the block at the current caret.
 * Reads the inline style first, then falls back to the computed style. When
 * no explicit alignment is set the browser default (left) is assumed.
 */
export const getCaretAlignment = (
  root: HTMLElement | null
): "left" | "center" | "right" | "justify" | null => {
  if (!root) return null;
  const selection = globalThis.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const block = getAlignableBlock(range.startContainer, root);
  if (!block) return null;

  let align = block.style.textAlign;
  if (!align && typeof globalThis.getComputedStyle === "function") {
    align = globalThis.getComputedStyle(block).textAlign;
  }

  switch (align) {
    case "center":
    case "right":
    case "justify":
      return align;
    case "start":
    case "left":
    case "":
    case undefined:
      return "left";
    default:
      return "left";
  }
};

/**
 * Find the <li> containing the current caret within root, if any.
 */
const getCaretListItem = (root: HTMLElement | null): HTMLElement | null => {
  if (!root) return null;
  const selection = globalThis.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  let current: Node | null = range.startContainer;
  while (current && current !== root) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      (current as HTMLElement).tagName.toLowerCase() === "li"
    ) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
};

/**
 * Whether the caret's list item can be indented: it must be a list item that
 * has a preceding sibling list item to nest under (mirrors indentListItem).
 */
export const canIndentListItem = (root: HTMLElement | null): boolean => {
  const li = getCaretListItem(root);
  if (!li) return false;
  const prev = li.previousElementSibling;
  if (!prev || prev.tagName.toLowerCase() !== "li") return false;
  const parent = li.parentElement;
  return Boolean(
    parent && ["ul", "ol"].includes(parent.tagName.toLowerCase())
  );
};

/**
 * Whether the caret's list item can be outdented: it must live inside a nested
 * list whose grandparent is another list item (mirrors outdentListItem).
 */
export const canOutdentListItem = (root: HTMLElement | null): boolean => {
  const li = getCaretListItem(root);
  if (!li) return false;
  const parentList = li.parentElement;
  if (
    !parentList ||
    !["ul", "ol"].includes(parentList.tagName.toLowerCase())
  ) {
    return false;
  }
  const grandparentLi = parentList.parentElement;
  if (!grandparentLi || grandparentLi.tagName.toLowerCase() !== "li") {
    return false;
  }
  const greatGrandparentList = grandparentLi.parentElement;
  return Boolean(
    greatGrandparentList &&
      ["ul", "ol"].includes(greatGrandparentList.tagName.toLowerCase())
  );
};

/** Inline em values applyFontSize writes, keyed by bucket. */
const FONT_SIZE_EM: Record<"small" | "normal" | "large" | "huge", string> = {
  small: "0.875em",
  normal: "1em",
  large: "1.25em",
  huge: "1.75em",
};

/**
 * Resolve the font-size bucket at the caret by walking up to the nearest
 * element carrying an inline font-size and reverse-mapping the em value that
 * applyFontSize wrote. Returns null when the caret is not inside a sized span,
 * so callers can fall back to the last-applied size (#19/#24).
 */
export const getCaretFontSize = (
  root: HTMLElement | null
): "small" | "normal" | "large" | "huge" | null => {
  if (!root) return null;
  const selection = globalThis.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  let current: Node | null = range.startContainer;
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const inline = (current as HTMLElement).style?.fontSize;
      if (inline) {
        const match = (
          Object.keys(FONT_SIZE_EM) as Array<keyof typeof FONT_SIZE_EM>
        ).find((bucket) => FONT_SIZE_EM[bucket] === inline);
        if (match) return match;
      }
    }
    current = current.parentNode;
  }
  return null;
};

interface ToolbarItemsOptions {
  /**
   * Buttons contributed by plugins. Surfaced in the Tools menu. #R23-45
   */
  pluginToolbarButtons?: Ref<ToolbarButton[]>;
  editorContent: Ref<HTMLDivElement | null>;
  fontSize: Ref<"small" | "normal" | "large" | "huge">;
  handleBlockAction: (tag: string) => void;
  handleInlineAction: (tag: string) => void;
  handleListAction: (tag: "ul" | "ol") => void;
  handleTextAlignment: (
    alignment: "left" | "center" | "right" | "justify"
  ) => void;
  handleFontSize: (size: "small" | "normal" | "large" | "huge") => void;
  handleInsertHR: () => void;
  handleInsertPageBreak: () => void;
  handleInsertTOC: () => void;
  isBlockActionActive: (tag: string) => boolean;
  isInlineActionActive: (tag: string) => boolean;
  isListActionActive: (tag: "ul" | "ol") => boolean;
  insertLink: () => void;
  insertImage: () => void;
  openFileManagerModal: () => void;
  openEmbedModal: () => void;
  openTableModal: () => void;
  openCodeBlockModal: () => void;
  openHtmlCodeModal: () => void;
  openFindReplaceModal: () => void;
  openTemplateModal: () => void;
  toggleEmojiPicker: () => void;
  handleToggleSpellCheck: () => void;
  handleExportHtml: () => void;
  handleExportMarkdown: () => void;
  handleExportPdf: () => void;
  isExportingPdf?: Ref<boolean>;
  handleExportWord: () => void;
  handleCopyFormat: () => void;
  handlePasteFormat: () => void;
  handleClearFormatting?: () => void;
  canClearFormatting?: () => boolean;
  hasFormatCopied: () => boolean;
  spellCheckEnabled: Ref<boolean>;
  captureSnapshot: () => void;
  toggleHistoryTimeline: () => void;
  /**
   * Opens the keyboard-shortcuts help modal. Optional so hosts that don't
   * render ShortcutHelpModal can omit it — the Tools item only appears when
   * a handler is provided.
   */
  openShortcutHelpModal?: () => void;
}

/**
 * Composable for toolbar item configurations
 * Centralizes all toolbar dropdown items and actions
 */
export function useToolbarItems(options: ToolbarItemsOptions) {
  const {
    pluginToolbarButtons,
    editorContent,
    fontSize,
    handleBlockAction,
    handleInlineAction,
    handleListAction,
    handleTextAlignment,
    handleFontSize,
    handleInsertHR,
    handleInsertPageBreak,
    handleInsertTOC,
    isBlockActionActive,
    isInlineActionActive,
    isListActionActive,
    insertLink,
    insertImage,
    openFileManagerModal,
    openEmbedModal,
    openTableModal,
    openCodeBlockModal,
    openHtmlCodeModal,
    openFindReplaceModal,
    openTemplateModal,
    toggleEmojiPicker,
    handleToggleSpellCheck,
    handleExportHtml,
    handleExportMarkdown,
    handleExportPdf,
    isExportingPdf,
    handleExportWord,
    handleCopyFormat,
    handlePasteFormat,
    handleClearFormatting,
    canClearFormatting,
    hasFormatCopied,
    spellCheckEnabled,
    captureSnapshot,
    toggleHistoryTimeline,
    openShortcutHelpModal,
  } = options;

  const formatDropdownItems = computed(() => [
    {
      id: "paragraph",
      label: "Paragraph",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/></svg>',
      onClick: () => handleBlockAction("p"),
      isActive: () => isBlockActionActive("p"),
    },
    { divider: true },
    {
      id: "h1",
      label: "Heading 1",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>',
      shortcut: "Ctrl+Alt+1",
      onClick: () => handleBlockAction("h1"),
      isActive: () => isBlockActionActive("h1"),
    },
    {
      id: "h2",
      label: "Heading 2",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
      shortcut: "Ctrl+Alt+2",
      onClick: () => handleBlockAction("h2"),
      isActive: () => isBlockActionActive("h2"),
    },
    {
      id: "h3",
      label: "Heading 3",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>',
      shortcut: "Ctrl+Alt+3",
      onClick: () => handleBlockAction("h3"),
      isActive: () => isBlockActionActive("h3"),
    },
  ]);

  const inlineFormatActions = computed(() => [
    {
      id: "bold",
      label: "Bold",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>',
      tooltip: "Bold (Ctrl+B)",
      onClick: () => handleInlineAction("strong"),
      isActive: () => isInlineActionActive("strong"),
    },
    {
      id: "italic",
      label: "Italic",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>',
      tooltip: "Italic (Ctrl+I)",
      onClick: () => handleInlineAction("em"),
      isActive: () => isInlineActionActive("em"),
    },
    {
      id: "underline",
      label: "Underline",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="21" y2="21"/></svg>',
      tooltip: "Underline (Ctrl+U)",
      onClick: () => handleInlineAction("u"),
      isActive: () => isInlineActionActive("u"),
    },
    {
      id: "strike",
      label: "Strikethrough",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>',
      tooltip: "Strikethrough",
      onClick: () => handleInlineAction("s"),
      isActive: () => isInlineActionActive("s"),
    },
  ]);

  // getCaretAlignment/getCaretFontSize read the LIVE DOM selection, which Vue
  // cannot track. Reading `selectionTick` (bumped by useActiveStates on every
  // document `selectionchange`) inside each isActive closure makes computeds
  // that call them — e.g. ToolbarDropdown's hasActiveItem/displayLabel —
  // re-evaluate as the caret moves, mirroring how isBlockActionActive and
  // isInlineActionActive gain their reactivity.
  const caretAlignment = (): ReturnType<typeof getCaretAlignment> => {
    void selectionTick.value;
    return getCaretAlignment(editorContent.value);
  };

  const alignmentDropdownItems = computed(() => [
    {
      id: "align-left",
      label: "Align Left",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>',
      onClick: () => handleTextAlignment("left"),
      isActive: () => caretAlignment() === "left",
    },
    {
      id: "align-center",
      label: "Center",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></svg>',
      onClick: () => handleTextAlignment("center"),
      isActive: () => caretAlignment() === "center",
    },
    {
      id: "align-right",
      label: "Align Right",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg>',
      onClick: () => handleTextAlignment("right"),
      isActive: () => caretAlignment() === "right",
    },
    {
      id: "align-justify",
      label: "Justify",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>',
      onClick: () => handleTextAlignment("justify"),
      isActive: () => caretAlignment() === "justify",
    },
  ]);

  // Prefer the caret's actual font size, falling back to the last applied
  // value when the caret is not inside a sized span (#19/#24). Touches
  // `selectionTick` so callers re-evaluate as the caret moves (see above).
  const activeFontSize = () => {
    void selectionTick.value;
    return getCaretFontSize(editorContent.value) ?? fontSize.value;
  };

  const fontSizeDropdownItems = computed(() => [
    {
      id: "size-small",
      label: "Small",
      onClick: () => handleFontSize("small"),
      isActive: () => activeFontSize() === "small",
    },
    {
      id: "size-normal",
      label: "Normal",
      onClick: () => handleFontSize("normal"),
      isActive: () => activeFontSize() === "normal",
    },
    {
      id: "size-large",
      label: "Large",
      onClick: () => handleFontSize("large"),
      isActive: () => activeFontSize() === "large",
    },
    {
      id: "size-huge",
      label: "Huge",
      onClick: () => handleFontSize("huge"),
      isActive: () => activeFontSize() === "huge",
    },
  ]);

  const listActions = computed(() => [
    {
      id: "bullet-list",
      label: "Bullet List",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
      tooltip: "Bullet list",
      onClick: () => handleListAction("ul"),
      isActive: () => isListActionActive("ul"),
    },
    {
      id: "numbered-list",
      label: "Numbered List",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h11"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
      tooltip: "Numbered list",
      onClick: () => handleListAction("ol"),
      isActive: () => isListActionActive("ol"),
    },
    {
      id: "increase-indent",
      label: "Increase Indent",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></svg>',
      tooltip: "Increase indent (Tab)",
      // Only act when the caret is in an indentable list item (#21)
      isDisabled: () => !canIndentListItem(editorContent.value),
      onClick: () => {
        if (!canIndentListItem(editorContent.value)) return;
        if (editorContent.value && indentListItem(editorContent.value)) {
          captureSnapshot();
        }
      },
    },
    {
      id: "decrease-indent",
      label: "Decrease Indent",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></svg>',
      tooltip: "Decrease indent (Shift+Tab)",
      // Outdent is disabled unless the caret sits in a nested list item (#21)
      isDisabled: () => !canOutdentListItem(editorContent.value),
      onClick: () => {
        if (!canOutdentListItem(editorContent.value)) return;
        if (editorContent.value && outdentListItem(editorContent.value)) {
          captureSnapshot();
        }
      },
    },
  ]);

  const insertDropdownItems = computed(() => [
    {
      id: "link",
      label: "Link",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      shortcut: "Ctrl+K",
      onClick: insertLink,
    },
    {
      id: "image",
      label: "Image",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
      onClick: insertImage,
    },
    {
      id: "file-manager",
      label: "File Manager",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
      onClick: openFileManagerModal,
    },
    {
      id: "video",
      label: "Video",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>',
      onClick: openEmbedModal,
    },
    { divider: true },
    {
      id: "table",
      label: "Table",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
      onClick: openTableModal,
    },
    {
      id: "code",
      label: "Code Block",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      onClick: openCodeBlockModal,
    },
    {
      id: "hr",
      label: "Horizontal Rule",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
      onClick: handleInsertHR,
    },
    {
      id: "page-break",
      label: "Page Break",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="12" y2="12"/><polyline points="8 8 12 4 16 8"/><polyline points="16 16 12 20 8 16"/></svg>',
      onClick: handleInsertPageBreak,
    },
    {
      id: "toc",
      label: "Table of Contents",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/></svg>',
      onClick: handleInsertTOC,
    },
    {
      id: "emoji",
      label: "Emoji",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
      onClick: toggleEmojiPicker,
    },
  ]);

  const toolActions = computed(() => [
    ...(handleClearFormatting ? [{
      id: "clear-formatting",
      label: "Clear Formatting",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 5 5a2 2 0 0 1 0 3l-9 9H7l-4-4a2 2 0 0 1 0-3l10-10a2 2 0 0 1 3 0Z"/><path d="m8 8 9 9M12 20h9"/></svg>',
      tooltip: "Clear selected text formatting (Ctrl+\\)",
      shortcut: "Ctrl+\\",
      onClick: handleClearFormatting,
      isDisabled: () => canClearFormatting ? !canClearFormatting() : false,
    }] : []),
    // Plugin-contributed buttons first-class in the Tools menu. Placed in the
    // dropdown rather than as new top-level toolbar buttons on purpose: the
    // top bar's wrap behaviour is load-bearing on small screens (trimming it
    // once broke the mobile-safari core-editing specs), and a dropdown adds
    // capability without touching that layout. #R23-45
    ...(pluginToolbarButtons?.value ?? []).map((button) => ({
      id: button.id,
      label: button.label,
      icon: button.icon ?? "",
      tooltip: button.title ?? button.label,
      onClick: button.onClick,
      // The ToolbarButton type documents these and the menu item renders
      // them — dropping them made an author's isDisabled guard render as an
      // ENABLED item that fired in the guarded state. #R24-12
      isActive: button.isActive,
      isDisabled: button.isDisabled,
      shortcut: button.shortcut,
    })),
    {
      id: "view-html",
      label: "View HTML Code",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/></svg>',
      tooltip: "View formatted HTML code",
      onClick: openHtmlCodeModal,
    },
    {
      id: "find",
      label: "Find & Replace",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      tooltip: "Find & Replace (Ctrl+F)",
      onClick: openFindReplaceModal,
    },
  ]);

  const exportDropdownItems = computed(() => [
    {
      id: "export-html",
      label: "HTML",
      shortcut: ".html",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="m9 13-2 2 2 2"/><path d="m13 17 2-2-2-2"/></svg>',
      tooltip: "Export as HTML",
      onClick: handleExportHtml,
    },
    {
      id: "export-md",
      label: "Markdown",
      shortcut: ".md",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="4.5" rx="2"/><path d="M6.5 15V9.5l3 3 3-3V15"/><path d="M17 9.5V13"/><path d="m15 12 2 2 2-2"/></svg>',
      tooltip: "Export as Markdown",
      onClick: handleExportMarkdown,
    },
    {
      id: "export-pdf",
      label: "PDF",
      shortcut: ".pdf",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="13" y1="17" y2="17"/></svg>',
      tooltip: "Export as PDF",
      disabled: Boolean(isExportingPdf?.value),
      onClick: handleExportPdf,
    },
    {
      id: "export-word",
      label: "Word",
      shortcut: ".docx",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="m8 12.5 1.4 5 1.6-4 1.6 4 1.4-5"/></svg>',
      tooltip: "Export as Word",
      onClick: handleExportWord,
    },
  ]);

  const productivityDropdownItems = computed(() => [
    {
      id: "format-painter-copy",
      label: "Copy Format",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/></svg>',
      onClick: handleCopyFormat,
    },
    {
      id: "format-painter-paste",
      label: "Paste Format",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/></svg>',
      onClick: handlePasteFormat,
      // Lazily evaluated on each property read (i.e. every menu render) so it
      // tracks the format painter's module-level state — copying a format
      // doesn't touch any reactive dependency, so a plain boolean captured
      // when this computed ran would stay stale forever.
      get disabled() {
        return !hasFormatCopied();
      },
    },
    { divider: true },
    {
      id: "spell-check",
      label: spellCheckEnabled.value
        ? "Disable Spell Check"
        : "Enable Spell Check",
      icon: spellCheckEnabled.value
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/><path d="m16 20 2 2 4-4"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>',
      onClick: handleToggleSpellCheck,
      // Reflect current spellcheck state in the Tools dropdown (#26)
      isActive: () => spellCheckEnabled.value,
    },
    { divider: true },
    {
      id: "templates",
      label: "Templates",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
      onClick: openTemplateModal,
    },
    {
      id: "history-timeline",
      label: "History Timeline",
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
      onClick: toggleHistoryTimeline,
    },
    // Keyboard-shortcuts help — only offered when the host wires a handler
    // (the modal itself is rendered by the host's modals container).
    ...(openShortcutHelpModal
      ? [
          {
            id: "keyboard-shortcuts",
            label: "Keyboard Shortcuts",
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M7 16h10"/></svg>',
            onClick: openShortcutHelpModal,
          },
        ]
      : []),
  ]);

  return {
    formatDropdownItems,
    inlineFormatActions,
    alignmentDropdownItems,
    fontSizeDropdownItems,
    listActions,
    insertDropdownItems,
    toolActions,
    exportDropdownItems,
    productivityDropdownItems,
  };
}
