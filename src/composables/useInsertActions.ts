import { type Ref, nextTick, ref } from "vue";
import { insertLink as insertLinkUtil } from "../utils/formatting";
import {
  insertHorizontalRule,
  insertTable as insertTableUtil,
  insertChecklist as insertChecklistUtil,
} from "../utils/commands";
import {
  insertPageBreak,
  insertTableOfContents,
} from "../utils/pageManagement";
import { smoothScrollIntoView } from "../utils/scroll";
import { fileManager } from "../utils/fileManager";
import {
  escapeCodeBlockAtCaret,
  splitBlockAtCaret,
  placeCaretInside,
} from "../utils/blockInsertion";
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
  showToast: (message: string, type?: "success" | "error", descriptor?: import('../types/locale').EditorMessageDescriptor) => void;
  openLinkModal: () => void;
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
    openLinkModal,
    openImageUploadModal,
    closeImageUploadModal,
    closeEmbedModal,
    closeFileManagerModal,
    closeEmojiPicker,
  } = options;

  const linkContext = ref({ url: "", text: "", selectionText: "", editing: false });

  /**
   * Open the styled link modal (remembers the current selection).
   */
  const insertLink = () => {
    linkContext.value = { url: "", text: "", selectionText: "", editing: false };
    performWithSelection((root) => {
      const selection = root.ownerDocument.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      const container = range.commonAncestorContainer;
      const element = container instanceof Element ? container : container.parentElement;
      const anchor = element?.closest('a');
      const link = anchor && root.contains(anchor) ? anchor : null;
      linkContext.value = {
        url: link?.getAttribute('href') ?? "",
        text: range.collapsed ? link?.textContent ?? "" : range.toString(),
        selectionText: range.collapsed ? "" : range.toString(),
        editing: Boolean(link),
      };
    });
    openLinkModal();
    console.debug('[NextLevelEditor] Link dialog opened', {
      editing: linkContext.value.editing,
      hasSelection: Boolean(linkContext.value.selectionText),
    });
  };

  /**
   * Insert a link from the modal at the remembered selection. When text was
   * selected it is wrapped; otherwise `text` (or the URL) becomes the link text.
   */
  const handleInsertLink = (url: string, text = "") => {
    if (!url) return;
    performWithSelection(
      (root) => insertLinkUtil(root, url, text),
      () => {
        captureSnapshot();
        console.debug('[NextLevelEditor] Link command applied');
      }
    );
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
      (root) => {
        // Block-level embed: never nest inside a code block
        escapeCodeBlockAtCaret(root);
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
    performWithSelection((root) => {
      // Block-level embed: never nest inside a code block
      escapeCodeBlockAtCaret(root);
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

    // A quota-degraded save leaves a file with metadata but no inline content
    // (url === ""); inserting it emitted `<img src="">` / `<a href="">`, giving
    // the user a broken image or a link that re-downloads the page. Refuse it
    // and say why instead. #R23-19
    if (!fileManager.isContentAvailable(file)) {
      showToast(
        `"${file.name}" lost its content when storage filled up and can't be inserted`,
        "error",
        { key: '"{name}" lost its content when storage filled up and can\'t be inserted', parameters: { name: String(file.name) } },
      );
      return;
    }

    // Insert file based on its type
    if (file.type.startsWith("image/")) {
      // Insert image wrapped in embedded resizable container
      performWithSelection(
        (root) => {
          escapeCodeBlockAtCaret(root);
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
        (root) => {
          escapeCodeBlockAtCaret(root);
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
        (root) => {
          escapeCodeBlockAtCaret(root);
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
   * Determine whether the current selection is contained within the editor
   * root. Insert actions that operate on the live selection must be scoped to
   * the editor so a stray caret elsewhere on the page never mutates unrelated
   * DOM.
   */
  const isSelectionInEditor = (
    root: HTMLElement,
    selection: Selection | null
  ): boolean => {
    return Boolean(
      selection &&
        selection.rangeCount > 0 &&
        selection.anchorNode &&
        root.contains(selection.anchorNode)
    );
  };

  /**
   * Build a collapsed selection at the end of the editor content, used as a
   * fallback when the live selection is outside/absent so insertions still
   * land inside the editor root.
   */
  const collapseSelectionToEditorEnd = (
    root: HTMLElement
  ): Selection | null => {
    const selection = globalThis.getSelection();
    if (!selection) return null;

    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
  };

  /**
   * Insert page break
   */
  const handleInsertPageBreak = () => {
    const root = editorContent.value;
    if (!root) return;

    let selection = globalThis.getSelection();
    // Guard: only act on the live selection when it is inside the editor,
    // otherwise append the page break at the end of the editor content.
    if (!isSelectionInEditor(root, selection)) {
      selection = collapseSelectionToEditorEnd(root);
    } else {
      escapeCodeBlockAtCaret(root);
    }

    insertPageBreak(selection, root);
    captureSnapshot();
  };

  /**
   * Insert table of contents
   */
  const handleInsertTOC = () => {
    const root = editorContent.value;
    if (!root) return;

    let selection = globalThis.getSelection();
    // Guard: contain the insertion to the editor root, falling back to the end
    // of the editor content when the selection is outside/absent.
    if (!isSelectionInEditor(root, selection)) {
      selection = collapseSelectionToEditorEnd(root);
    } else {
      escapeCodeBlockAtCaret(root);
    }

    // A document with no headings has no TOC to build. This used to write the
    // placeholder sentence "No headings found in the document." into the
    // document as real content; say it in a toast instead. #R23-39
    if (!insertTableOfContents(root, selection)) {
      showToast("Add a heading first — a table of contents needs one", "error");
      return;
    }
    captureSnapshot();
  };

  /**
   * Insert horizontal rule
   */
  const handleInsertHR = () => {
    performWithSelection((root) => {
      escapeCodeBlockAtCaret(root);
      insertHorizontalRule();
    });
  };

  /**
   * Insert a checklist block (any selection becomes the first item's label).
   */
  const handleInsertChecklist = () => {
    performWithSelection((root) => {
      escapeCodeBlockAtCaret(root);
      insertChecklistUtil(root);
      captureSnapshot();
    });
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
        escapeCodeBlockAtCaret(root);
        insertTableUtil(root, data.rows, data.cols, data.includeHeader);
        captureSnapshot();

        // Show success notification
        showToast(`✓ Table (${data.rows}×${data.cols}) inserted successfully!`, 'success', { key: '✓ Table ({rows}×{columns}) inserted successfully!', parameters: { rows: data.rows, columns: data.cols } });
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
   * Check if cursor is inside a list and exit list context if needed
   */
  const exitListContextIfNeeded = (selection: Selection): Range | null => {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;

    // Find if we're inside a list item
    let listItem: HTMLElement | null = null;
    let list: HTMLElement | null = null;

    while (node && node.nodeType !== Node.DOCUMENT_NODE) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.tagName === "LI") {
          listItem = element;
        } else if (element.tagName === "UL" || element.tagName === "OL") {
          list = element;
          break;
        }
      }
      node = node.parentNode;
    }

    // If we're inside a list, insert after the list instead
    if (list && listItem) {
      const newRange = document.createRange();
      newRange.setStartAfter(list);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      return newRange;
    }

    return range;
  };

  /**
   * Insert code block with language
   */
  const handleInsertCodeBlock = (data: { code: string; language: string }) => {
    if (!editorContent.value) return;

    performWithSelection(
      (root) => {
        escapeCodeBlockAtCaret(root);
        const selection = globalThis.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        // Exit list context if we're inside a list
        const range = exitListContextIfNeeded(selection);
        if (!range) return;

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

        // Split the caret's paragraph/heading first: inserting <pre> at a caret
        // inside a <p> nests a block in a <p>, which the parser foster-parents on
        // the next round-trip (orphaning the trailing text). Mirror the other
        // block inserters (HR, table, checklist).
        const tail = splitBlockAtCaret(range, root);
        if (tail?.parentNode) {
          tail.parentNode.insertBefore(pre, tail);
          placeCaretInside(tail, true);
        } else {
          range.insertNode(pre);
          const newRange = document.createRange();
          newRange.setStartAfter(pre);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        captureSnapshot();
        showToast(`✓ Code block inserted (${data.language || "text"})`, 'success', { key: '✓ Code block inserted ({language})', parameters: { language: data.language || 'text' } });
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
    linkContext,
    insertLink,
    handleInsertLink,
    insertImage,
    handleInsertImage,
    handleInsertEmbed,
    handleInsertFile,
    handleInsertEmoji,
    handleInsertPageBreak,
    handleInsertTOC,
    handleInsertHR,
    handleInsertChecklist,
    handleInsertTable,
    handleInsertCodeBlock,
  };
}
