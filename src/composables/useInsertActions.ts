import { type Ref, nextTick } from "vue";
import { insertLink as insertLinkUtil } from "../utils/formatting";
import {
  insertHorizontalRule,
  insertTable as insertTableUtil,
} from "../utils/commands";
import {
  insertPageBreak,
  insertTableOfContents,
} from "../utils/pageManagement";
import { smoothScrollIntoView } from "../utils/scroll";
import {
  insertEmbeddedResizable,
  type EmbeddedContentOptions,
} from "../utils/embeddedResizable";

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
    if (!editorContent.value) return;

    performWithSelection(
      () => {
        // Insert image wrapped in embedded resizable container
        const options: EmbeddedContentOptions = {
          type: "image",
          src: url,
          alt,
          width: 500,
          height: 400,
          maintainAspectRatio: true,
          alignment: "center",
        };
        insertEmbeddedResizable(options);
        captureSnapshot();
      },
      () => {
        // After action callback
        nextTick(() => {
          // Find the newly inserted embedded container and scroll to it
          const embeddedContainers = editorContent.value?.querySelectorAll(
            ".embedded-resizable-container"
          );
          if (embeddedContainers && embeddedContainers.length > 0) {
            const lastContainer = embeddedContainers[
              embeddedContainers.length - 1
            ] as HTMLElement;
            smoothScrollIntoView(lastContainer, {
              behavior: "smooth",
              block: "center",
            });
          }
        });
      }
    );
    closeImageUploadModal();
  };

  /**
   * Insert HTML embed content
   */
  const handleInsertEmbed = (html: string) => {
    if (!editorContent.value) return;
    performWithSelection(() => {
      // Insert video/embed wrapped in embedded resizable container
      const options: EmbeddedContentOptions = {
        type: "embed",
        src: html,
        alt: "Video embed",
        width: 640,
        height: 360,
        maintainAspectRatio: true,
        alignment: "center",
      };
      insertEmbeddedResizable(options);
      captureSnapshot();
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
      // Insert image wrapped in embedded resizable container
      performWithSelection(
        () => {
          const options: EmbeddedContentOptions = {
            type: "image",
            src: file.url,
            alt: file.name || "Uploaded image",
            width: 500,
            height: 400,
            maintainAspectRatio: true,
            alignment: "center",
          };
          insertEmbeddedResizable(options);
          captureSnapshot();
        },
        () => {
          // After action callback
          nextTick(() => {
            const embeddedContainers = editorContent.value?.querySelectorAll(
              ".embedded-resizable-container"
            );
            if (embeddedContainers && embeddedContainers.length > 0) {
              const lastContainer = embeddedContainers[
                embeddedContainers.length - 1
              ] as HTMLElement;
              smoothScrollIntoView(lastContainer, {
                behavior: "smooth",
                block: "center",
              });
            }
          });
        }
      );
    } else if (file.type.startsWith("video/")) {
      // Insert video wrapped in embedded resizable container
      performWithSelection(
        () => {
          const options: EmbeddedContentOptions = {
            type: "video",
            src: file.url,
            alt: file.name || "Uploaded video",
            width: 640,
            height: 360,
            maintainAspectRatio: true,
            alignment: "center",
          };
          insertEmbeddedResizable(options);
          captureSnapshot();
        },
        () => {
          // After action callback
          nextTick(() => {
            const embeddedContainers = editorContent.value?.querySelectorAll(
              ".embedded-resizable-container"
            );
            if (embeddedContainers && embeddedContainers.length > 0) {
              const lastContainer = embeddedContainers[
                embeddedContainers.length - 1
              ] as HTMLElement;
              smoothScrollIntoView(lastContainer, {
                behavior: "smooth",
                block: "center",
              });
            }
          });
        }
      );
    } else {
      // Insert as downloadable file wrapped in embedded resizable container
      performWithSelection(
        () => {
          const options: EmbeddedContentOptions = {
            type: "file",
            src: file.url,
            alt: file.name || "Download file",
            width: 300,
            height: 200,
            maintainAspectRatio: false,
            alignment: "center",
          };
          insertEmbeddedResizable(options);
          captureSnapshot();
        },
        () => {
          // After action callback
          nextTick(() => {
            const embeddedContainers = editorContent.value?.querySelectorAll(
              ".embedded-resizable-container"
            );
            if (embeddedContainers && embeddedContainers.length > 0) {
              const lastContainer = embeddedContainers[
                embeddedContainers.length - 1
              ] as HTMLElement;
              smoothScrollIntoView(lastContainer, {
                behavior: "smooth",
                block: "center",
              });
            }
          });
        }
      );
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

      captureSnapshot();
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
    if (!editorContent.value) return;

    performWithSelection(
      (root) => {
        insertTableUtil(root, data.rows, data.cols, data.includeHeader);
        captureSnapshot();

        // Show success notification
        showToast(`✓ Table (${data.rows}×${data.cols}) inserted successfully!`);
      },
      () => {
        // After action callback - scroll to the newly inserted table
        nextTick(() => {
          const tables = editorContent.value?.querySelectorAll("table");
          if (tables && tables.length > 0) {
            const lastTable = tables[tables.length - 1];
            smoothScrollIntoView(lastTable, {
              behavior: "smooth",
              block: "center",
            });

            // Focus first cell in the table
            const firstCell = lastTable.querySelector("td, th");
            if (firstCell instanceof HTMLElement) {
              firstCell.focus();
            }
          }
        });
      }
    );
  };

  /**
   * Insert code block with language
   */
  const handleInsertCodeBlock = (data: { code: string; language: string }) => {
    if (!editorContent.value) return;

    performWithSelection(
      () => {
        const selection = globalThis.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        const pre = document.createElement("pre");
        pre.style.margin = "16px 0";
        pre.style.padding = "12px";
        pre.style.backgroundColor = "var(--secondary-bg, #f3f4f6)";
        pre.style.borderRadius = "6px";
        pre.style.overflow = "auto";

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

        captureSnapshot();
        showToast(`✓ Code block inserted (${data.language || "text"})`);
      },
      () => {
        // After action callback - scroll to code block
        nextTick(() => {
          const codeBlocks = editorContent.value?.querySelectorAll("pre");
          if (codeBlocks && codeBlocks.length > 0) {
            const lastCodeBlock = codeBlocks[codeBlocks.length - 1];
            smoothScrollIntoView(lastCodeBlock, {
              behavior: "smooth",
              block: "center",
            });
          }
        });
      }
    );
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
