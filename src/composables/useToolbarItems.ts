import { computed, type Ref } from "vue";
import { indentListItem, outdentListItem } from "../utils/formatting";

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
  toggleFullScreen: () => void;
  handleToggleSpellCheck: () => void;
  handleExportHtml: () => void;
  handleExportMarkdown: () => void;
  handleExportPdf: () => void;
  handleExportWord: () => void;
  handleCopyFormat: () => void;
  handlePasteFormat: () => void;
  hasFormatCopied: () => boolean;
  isFullScreen: Ref<boolean>;
  spellCheckEnabled: Ref<boolean>;
  captureSnapshot: () => void;
}

/**
 * Composable for toolbar item configurations
 * Centralizes all toolbar dropdown items and actions
 */
export function useToolbarItems(options: ToolbarItemsOptions) {
  const {
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
    toggleFullScreen,
    handleToggleSpellCheck,
    handleExportHtml,
    handleExportMarkdown,
    handleExportPdf,
    handleExportWord,
    handleCopyFormat,
    handlePasteFormat,
    hasFormatCopied,
    isFullScreen,
    spellCheckEnabled,
    captureSnapshot,
  } = options;

  const formatDropdownItems = computed(() => [
    {
      id: "paragraph",
      label: "Paragraph",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z"/></svg>',
      onClick: () => handleBlockAction("p"),
      isActive: () => isBlockActionActive("p"),
    },
    { divider: true },
    {
      id: "h1",
      label: "Heading 1",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v5h4V2h2v12h-2V9H4v5H2V2zm10 10v2h2v-2h-2zm0-3v2h2V9h-2z"/></svg>',
      shortcut: "Ctrl+Alt+1",
      onClick: () => handleBlockAction("h1"),
      isActive: () => isBlockActionActive("h1"),
    },
    {
      id: "h2",
      label: "Heading 2",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v5h4V2h2v12h-2V9H4v5H2V2zm10 10v2h4v-2l-2-2.5a1 1 0 0 1 1-1.5h1V9h-2a2 2 0 0 0-2 3.5L13 14h-1z"/></svg>',
      shortcut: "Ctrl+Alt+2",
      onClick: () => handleBlockAction("h2"),
      isActive: () => isBlockActionActive("h2"),
    },
    {
      id: "h3",
      label: "Heading 3",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v5h4V2h2v12h-2V9H4v5H2V2zm10 7a1.5 1.5 0 0 0 0 3h1v2h-2v-1h-1v2h4v-3a1.5 1.5 0 0 0 0-3h-1V8h2V7h-3v2z"/></svg>',
      shortcut: "Ctrl+Alt+3",
      onClick: () => handleBlockAction("h3"),
      isActive: () => isBlockActionActive("h3"),
    },
  ]);

  const inlineFormatActions = computed(() => [
    {
      id: "bold",
      label: "Bold",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h5a3.5 3.5 0 0 1 2.5 6A3.5 3.5 0 0 1 9 14H4V2zm5 5.5A1.5 1.5 0 0 0 9 4H6v3h3zm0 5A1.5 1.5 0 0 0 9 10H6v3h3z"/></svg>',
      tooltip: "Bold (Ctrl+B)",
      onClick: () => handleInlineAction("strong"),
      isActive: () => isInlineActionActive("strong"),
    },
    {
      id: "italic",
      label: "Italic",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2h6v2H9.5l-2 8H10v2H4v-2h2.5l2-8H6V2z"/></svg>',
      tooltip: "Italic (Ctrl+I)",
      onClick: () => handleInlineAction("em"),
      isActive: () => isInlineActionActive("em"),
    },
    {
      id: "underline",
      label: "Underline",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 14v-1h10v1H3zm5-12v7a2 2 0 1 0 4 0V2h2v7a4 4 0 1 1-8 0V2h2z"/></svg>',
      tooltip: "Underline (Ctrl+U)",
      onClick: () => handleInlineAction("u"),
      isActive: () => isInlineActionActive("u"),
    },
    {
      id: "strike",
      label: "Strikethrough",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8h12v1H2V8zm6-6a3.5 3.5 0 0 0-3.5 3.5H3A5 5 0 0 1 8 .5a5 5 0 0 1 4.027 2H10.5A3.5 3.5 0 0 0 8 2zm0 12a3.5 3.5 0 0 1-3.5-3.5H3A5 5 0 0 0 8 15.5a5 5 0 0 0 4.027-2H10.5A3.5 3.5 0 0 1 8 14z"/></svg>',
      tooltip: "Strikethrough",
      onClick: () => handleInlineAction("s"),
      isActive: () => isInlineActionActive("s"),
    },
  ]);

  const alignmentDropdownItems = computed(() => [
    {
      id: "align-left",
      label: "Align Left",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h8v1H2V5zm0 3h12v1H2V8zm0 3h8v1H2v-1zm0 3h12v1H2v-1z"/></svg>',
      onClick: () => handleTextAlignment("left"),
      isActive: () => getCaretAlignment(editorContent.value) === "left",
    },
    {
      id: "align-center",
      label: "Center",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm2 3h8v1H4V5zm-2 3h12v1H2V8zm2 3h8v1H4v-1zm-2 3h12v1H2v-1z"/></svg>',
      onClick: () => handleTextAlignment("center"),
      isActive: () => getCaretAlignment(editorContent.value) === "center",
    },
    {
      id: "align-right",
      label: "Align Right",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm4 3h8v1H6V5zm-4 3h12v1H2V8zm4 3h8v1H6v-1zm-4 3h12v1H2v-1z"/></svg>',
      onClick: () => handleTextAlignment("right"),
      isActive: () => getCaretAlignment(editorContent.value) === "right",
    },
    {
      id: "align-justify",
      label: "Justify",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h12v1H2V8zm0 3h12v1H2v-1zm0 3h12v1H2v-1z"/></svg>',
      onClick: () => handleTextAlignment("justify"),
      isActive: () => getCaretAlignment(editorContent.value) === "justify",
    },
  ]);

  // Prefer the caret's actual font size, falling back to the last applied
  // value when the caret is not inside a sized span (#19/#24).
  const activeFontSize = () =>
    getCaretFontSize(editorContent.value) ?? fontSize.value;

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
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="2.5" cy="3.5" r="1.5"/><path d="M5 3h9v1H5V3z"/><circle cx="2.5" cy="8" r="1.5"/><path d="M5 7.5h9v1H5v-1z"/><circle cx="2.5" cy="12.5" r="1.5"/><path d="M5 12h9v1H5v-1z"/></svg>',
      tooltip: "Bullet list",
      onClick: () => handleListAction("ul"),
      isActive: () => isListActionActive("ul"),
    },
    {
      id: "numbered-list",
      label: "Numbered List",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h1v3H2V2zm0 4h1v1H1v-.5L2 6H1V5h2v1zM1 10h2v1H1v1h2v1H1v-3zm4-7h9v1H5V3zm0 4.5h9v1H5v-1zm0 4.5h9v1H5v-1z"/></svg>',
      tooltip: "Numbered list",
      onClick: () => handleListAction("ol"),
      isActive: () => isListActionActive("ol"),
    },
    {
      id: "increase-indent",
      label: "Increase Indent",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h10v1H3V2zm0 3h10v1H3V5zm0 3h10v1H3V8zm0 3h10v1H3v-1zm0 3h10v1H3v-1zM1 5.5l2 2-2 2v-4z"/></svg>',
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
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h10v1H3V2zm0 3h10v1H3V5zm0 3h10v1H3V8zm0 3h10v1H3v-1zm0 3h10v1H3v-1zM3 5.5l-2 2 2 2v-4z"/></svg>',
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
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 11a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1h-3zm-2-3a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8zm-2-3a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1h-1V5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v1h-1a2 2 0 0 1-2-2V5z"/></svg>',
      shortcut: "Ctrl+K",
      onClick: insertLink,
    },
    {
      id: "image",
      label: "Image",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 1v7.5l3-3 2.5 2.5 4-4L14 7.5V3H3zm8.5 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>',
      onClick: insertImage,
    },
    {
      id: "file-manager",
      label: "File Manager",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2a1 1 0 0 1 1-1h4l1 1h5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2zm2 1v8h9V4H7L6 3H4z"/></svg>',
      onClick: openFileManagerModal,
    },
    {
      id: "video",
      label: "Video",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm9 1v8l4-4-4-4z"/></svg>',
      onClick: openEmbedModal,
    },
    { divider: true },
    {
      id: "table",
      label: "Table",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v12H2V2zm1 1v3h4V3H3zm5 0v3h5V3H8zM3 7v3h4V7H3zm5 0v3h5V7H8zM3 11v2h4v-2H3zm5 0v2h5v-2H8z"/></svg>',
      onClick: openTableModal,
    },
    {
      id: "code",
      label: "Code Block",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l-3 5 3 5V3zm6 0v10l3-5-3-5zM7 6h2v1H7V6zm0 2h2v1H7V8zm0 2h2v1H7v-1z"/></svg>',
      onClick: openCodeBlockModal,
    },
    {
      id: "hr",
      label: "Horizontal Rule",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8h12v1H2V8z"/></svg>',
      onClick: handleInsertHR,
    },
    {
      id: "page-break",
      label: "Page Break",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v1H2V2zm7 0h5v1H9V2zM2 6h1v1H2V6zm3 0h1v1H5V6zm3 0h1v1H8V6zm3 0h1v1h-1V6zm3 0h1v1h-1V6zM2 8h12v1H2V8zm0 4h5v1H2v-1zm7 0h5v1H9v-1z"/></svg>',
      onClick: handleInsertPageBreak,
    },
    {
      id: "toc",
      label: "Table of Contents",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v2H2V2zm3 0h9v2H5V2zM2 6h2v2H2V6zm3 0h9v2H5V6zM2 10h2v2H2v-2zm3 0h9v2H5v-2z"/></svg>',
      onClick: handleInsertTOC,
    },
    {
      id: "emoji",
      label: "Emoji",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/><path d="M5 10c0 1.5 1.3 3 3 3s3-1.5 3-3H5z"/></svg>',
      onClick: toggleEmojiPicker,
    },
  ]);

  const toolActions = computed(() => [
    {
      id: "view-html",
      label: "View HTML Code",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l-3 5 3 5V3zm6 0v10l3-5-3-5z"/></svg>',
      tooltip: "View formatted HTML code",
      onClick: openHtmlCodeModal,
    },
    {
      id: "find",
      label: "Find & Replace",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      tooltip: "Find & Replace (Ctrl+F)",
      onClick: openFindReplaceModal,
    },
    {
      id: "spell-check-toggle",
      label: "Toggle Spell Check",
      icon: spellCheckEnabled.value
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 3l-8 8-3-3-1 1 4 4 9-9-1-1z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v1H3V3zm0 3h10v1H3V6zm0 3h10v1H3V9zm0 3h6v1H3v-1z"/></svg>',
      tooltip: spellCheckEnabled.value
        ? "Disable Spell Check"
        : "Enable Spell Check",
      onClick: handleToggleSpellCheck,
      isActive: () => spellCheckEnabled.value,
    },
    {
      id: "export-html",
      label: "Export HTML",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 1.5h5L12 5v8.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" fill="currentColor" opacity="0.16"/><path d="M8.5 1.5 12 5H9.5a1 1 0 0 1-1-1V1.5z" fill="currentColor"/><text x="7.75" y="12.1" text-anchor="middle" textLength="8" lengthAdjust="spacingAndGlyphs" font-size="4.6" font-weight="700" font-family="system-ui,sans-serif" fill="currentColor">HTML</text></svg>',
      tooltip: "Export as HTML (.html)",
      onClick: handleExportHtml,
    },
    {
      id: "export-md",
      label: "Export Markdown",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 1.5h5L12 5v8.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" fill="currentColor" opacity="0.16"/><path d="M8.5 1.5 12 5H9.5a1 1 0 0 1-1-1V1.5z" fill="currentColor"/><text x="7.75" y="12.1" text-anchor="middle" textLength="5" lengthAdjust="spacingAndGlyphs" font-size="4.6" font-weight="700" font-family="system-ui,sans-serif" fill="currentColor">MD</text></svg>',
      tooltip: "Export as Markdown (.md)",
      onClick: handleExportMarkdown,
    },
    {
      id: "export-pdf",
      label: "Export PDF",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 1.5h5L12 5v8.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" fill="currentColor" opacity="0.16"/><path d="M8.5 1.5 12 5H9.5a1 1 0 0 1-1-1V1.5z" fill="currentColor"/><text x="7.75" y="12.1" text-anchor="middle" textLength="6.5" lengthAdjust="spacingAndGlyphs" font-size="4.6" font-weight="700" font-family="system-ui,sans-serif" fill="currentColor">PDF</text></svg>',
      tooltip: "Export as PDF (.pdf)",
      onClick: handleExportPdf,
    },
    {
      id: "export-word",
      label: "Export Word",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 1.5h5L12 5v8.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" fill="currentColor" opacity="0.16"/><path d="M8.5 1.5 12 5H9.5a1 1 0 0 1-1-1V1.5z" fill="currentColor"/><text x="7.75" y="12.1" text-anchor="middle" textLength="8" lengthAdjust="spacingAndGlyphs" font-size="4.6" font-weight="700" font-family="system-ui,sans-serif" fill="currentColor">DOCX</text></svg>',
      tooltip: "Export as Word (.docx)",
      onClick: handleExportWord,
    },
    {
      id: "fullscreen",
      label: "Fullscreen",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3v4H3V4h3V3H2zm11 0h-4v1h3v3h1V3zM3 9H2v4h4v-1H3V9zm10 0v3h-3v1h4V9h-1z"/></svg>',
      tooltip: "Toggle fullscreen",
      onClick: toggleFullScreen,
      isActive: () => isFullScreen.value,
    },
  ]);

  const productivityDropdownItems = computed(() => [
    {
      id: "format-painter-copy",
      label: "Copy Format",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h1v2H3V2h1V1zM3 4h10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/></svg>',
      onClick: handleCopyFormat,
    },
    {
      id: "format-painter-paste",
      label: "Paste Format",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3h2V2zm1 0v1h4V2H6zM4 4v9h8V4H4z"/></svg>',
      onClick: handlePasteFormat,
      disabled: !hasFormatCopied(),
    },
    { divider: true },
    {
      id: "spell-check",
      label: spellCheckEnabled.value
        ? "Disable Spell Check"
        : "Enable Spell Check",
      icon: spellCheckEnabled.value
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 3l-8 8-3-3-1 1 4 4 9-9-1-1z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h1v12H2V2zm11 0h1v12h-1V2zM5 5h6v1H5V5zm0 3h6v1H5V8zm0 3h6v1H5v-1z"/></svg>',
      onClick: handleToggleSpellCheck,
      // Reflect current spellcheck state in the Tools dropdown (#26)
      isActive: () => spellCheckEnabled.value,
    },
    { divider: true },
    {
      id: "templates",
      label: "Templates",
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h4v4H2V2zm5 0h4v4H7V2zm5 0h2v4h-2V2zM2 7h4v4H2V7zm5 0h4v4H7V7zm5 0h2v4h-2V7zM2 12h4v2H2v-2zm5 0h4v2H7v-2zm5 0h2v2h-2v-2z"/></svg>',
      onClick: openTemplateModal,
    },
  ]);

  return {
    formatDropdownItems,
    inlineFormatActions,
    alignmentDropdownItems,
    fontSizeDropdownItems,
    listActions,
    insertDropdownItems,
    toolActions,
    productivityDropdownItems,
  };
}
