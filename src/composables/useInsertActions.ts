import { type Ref, nextTick } from "vue";
import {
  insertLink as insertLinkUtil,
  insertImage as insertImageUtil,
} from "../utils/formatting";
import {
  insertHorizontalRule,
  insertTable as insertTableUtil,
} from "../utils/commands";
import {
  insertPageBreak,
  insertTableOfContents,
} from "../utils/pageManagement";

interface InsertActionsOptions {
  editorContent: Ref<HTMLElement | null>;
  performWithSelection: (
    callback: (root: HTMLElement) => void,
    afterCallback?: () => void
  ) => void;
  captureSnapshot: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  openImageUploadModal: () => void;
  closeImageUploadModal: () => void;
  closeEmbedModal: () => void;
  closeFileManagerModal: () => void;
  closeEmojiPicker: () => void;
}

/**
 * Composable for handling all insert operations in the editor
 * Provides methods for inserting links, images, embeds, files, emojis, page breaks, TOC, HR, code blocks, and tables
 */
export function useInsertActions(options: InsertActionsOptions) {
  const {
    editorContent,
    performWithSelection,
    captureSnapshot,
    showToast,
    openImageUploadModal,
    closeImageUploadModal,
    closeEmbedModal,
    closeFileManagerModal,
    closeEmojiPicker,
  } = options;

  /**
   * Insert a link with URL prompt
   */
  const insertLink = () => {
    const url = prompt("Enter the URL:");
    if (url) {
      performWithSelection(
        (root) => insertLinkUtil(root, url),
        captureSnapshot
      );
    }
  };

  /**
   * Open image upload modal
   */
  const insertImage = () => {
    openImageUploadModal();
  };

  /**
   * Insert image with URL and alt text
   */
  const handleInsertImage = (url: string, alt: string) => {
    performWithSelection(
      (root) => insertImageUtil(root, url, alt),
      captureSnapshot
    );
    closeImageUploadModal();
  };

  /**
   * Insert HTML embed content
   */
  const handleInsertEmbed = (html: string) => {
    if (!editorContent.value) return;
    performWithSelection(() => {
      const selection = globalThis.getSelection();
      if (!selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      // Create a temporary container to parse the HTML
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Insert the content
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
      range.insertNode(fragment);

      // Move cursor after inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    closeEmbedModal();
  };

  /**
   * Insert file (as image or link depending on type)
   */
  const handleInsertFile = (file: any) => {
    if (!editorContent.value) return;

    // Insert file based on its type
    if (file.type.startsWith("image/")) {
      // Insert as image
      performWithSelection((root) =>
        insertImageUtil(root, file.url, file.name)
      );
    } else {
      // Insert as link for other file types
      performWithSelection(() => {
        const selection = globalThis.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        const link = document.createElement("a");
        link.href = file.url;
        link.textContent = file.name;
        link.download = file.name;
        link.target = "_blank";

        range.deleteContents();
        range.insertNode(link);
        range.collapse(false);
      });
    }

    closeFileManagerModal();
  };

  /**
   * Insert emoji at cursor position
   */
  const handleInsertEmoji = (emoji: string) => {
    performWithSelection(() => {
      const selection = globalThis.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode(emoji);

      range.deleteContents();
      range.insertNode(textNode);

      // Move cursor after emoji
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    });

    closeEmojiPicker();
  };

  /**
   * Insert page break
   */
  const handleInsertPageBreak = () => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    insertPageBreak(selection);
    captureSnapshot();
  };

  /**
   * Insert table of contents
   */
  const handleInsertTOC = () => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    insertTableOfContents(editorContent.value, selection);
    captureSnapshot();
  };

  /**
   * Insert horizontal rule
   */
  const handleInsertHR = () => {
    performWithSelection(() => insertHorizontalRule());
  };

  /**
   * Insert table with specified dimensions
   */
  const handleInsertTable = (data: {
    rows: number;
    cols: number;
    includeHeader: boolean;
  }) => {
    performWithSelection((root) => {
      insertTableUtil(root, data.rows, data.cols, data.includeHeader);

      // Show success notification
      showToast(`✓ Table (${data.rows}×${data.cols}) inserted successfully!`);

      // Find the newly inserted table and scroll to it
      nextTick(() => {
        const tables = editorContent.value?.querySelectorAll("table");
        if (tables && tables.length > 0) {
          const lastTable = tables[tables.length - 1];
          lastTable.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  };

  /**
   * Insert code block with language
   */
  const handleInsertCodeBlock = (data: { code: string; language: string }) => {
    performWithSelection(() => {
      const selection = globalThis.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      const pre = document.createElement("pre");
      pre.style.margin = "16px 0";

      const code = document.createElement("code");
      code.className = `language-${data.language}`;
      code.textContent = data.code;

      pre.appendChild(code);

      range.deleteContents();
      range.insertNode(pre);

      // Move cursor after code block
      const newRange = document.createRange();
      newRange.setStartAfter(pre);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    });
  };

  return {
    insertLink,
    insertImage,
    handleInsertImage,
    handleInsertEmbed,
    handleInsertFile,
    handleInsertEmoji,
    handleInsertPageBreak,
    handleInsertTOC,
    handleInsertHR,
    handleInsertTable,
    handleInsertCodeBlock,
  };
}
