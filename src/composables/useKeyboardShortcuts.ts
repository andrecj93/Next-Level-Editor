import { type Ref } from "vue";
import { indentListItem, outdentListItem } from "../utils/formatting";

const BLOCK_ELEMENT_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
]);

interface KeyboardShortcutsOptions {
  editorContent: Ref<HTMLDivElement | null>;
  onInput: () => void;
  onCaptureSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  openCommandMenu: () => void;
  insertLink: () => void;
  openFindReplaceModal: () => void;
  handleInlineAction: (tag: string) => void;
  handleBlockAction: (tag: string) => void;
}

/**
 * Checks if an element or document fragment has no meaningful text content
 */
function isEmptyContent(element: HTMLElement | DocumentFragment): boolean {
  let content: string | null | undefined;

  if (element instanceof DocumentFragment) {
    content = Array.from(element.childNodes)
      .map((n) => n.textContent)
      .join("");
  } else {
    content = element.textContent;
  }

  return !content?.trim();
}

/**
 * Ensures an element is visible by adding a <br> tag if it's empty
 */
function ensureVisibleElement(element: HTMLElement) {
  if (isEmptyContent(element) && !element.querySelector("br")) {
    element.innerHTML = "<br>";
  }
}

/**
 * Populates a new element with extracted content, ensuring it remains visible
 */
function populateNewElement(element: HTMLElement, content: DocumentFragment) {
  if (content.childNodes.length === 0) {
    element.innerHTML = "<br>";
  } else {
    element.appendChild(content);
    ensureVisibleElement(element);
  }
}

/**
 * Composable for managing keyboard shortcuts in the editor
 * Handles Enter key behavior, Tab indentation, and command shortcuts
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    editorContent,
    onCaptureSnapshot,
    undo,
    redo,
    openCommandMenu,
    insertLink,
    openFindReplaceModal,
    handleInlineAction,
    handleBlockAction,
  } = options;

  /**
   * Find the current block element from a node
   */
  const findCurrentBlock = (
    startNode: Node
  ): { block: HTMLElement | null; tag: string } => {
    let currentBlock: HTMLElement | null = null;
    let currentBlockTag = "";
    let node: Node | null = startNode;

    while (node && node !== editorContent.value) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        if (BLOCK_ELEMENT_TAGS.has(tagName)) {
          currentBlock = element;
          currentBlockTag = tagName;
          break;
        }
      }
      node = node.parentNode;
    }

    return { block: currentBlock, tag: currentBlockTag };
  };

  /**
   * Handle Enter key within a list item
   */
  const handleEnterInListItem = (
    range: Range,
    currentBlock: HTMLElement,
    selection: Selection
  ) => {
    const afterRange = document.createRange();
    afterRange.setStart(range.startContainer, range.startOffset);
    afterRange.setEnd(currentBlock, currentBlock.childNodes.length);
    const afterContent = afterRange.extractContents();

    const newLi = document.createElement("li");
    populateNewElement(newLi, afterContent);
    ensureVisibleElement(currentBlock);

    if (currentBlock.nextSibling) {
      currentBlock.parentNode?.insertBefore(newLi, currentBlock.nextSibling);
    } else {
      currentBlock.parentNode?.appendChild(newLi);
    }

    const newRange = document.createRange();
    newRange.setStart(newLi, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    if (editorContent.value) {
      editorContent.value.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  /**
   * Handle Enter key within a regular block element
   */
  const handleEnterInBlock = (
    range: Range,
    currentBlock: HTMLElement,
    newParagraph: HTMLParagraphElement
  ) => {
    const afterRange = document.createRange();
    afterRange.setStart(range.startContainer, range.startOffset);
    afterRange.setEnd(currentBlock, currentBlock.childNodes.length);
    const afterContent = afterRange.extractContents();

    ensureVisibleElement(currentBlock);
    populateNewElement(newParagraph, afterContent);

    // Clear inherited inline styles from headings or styled blocks
    // Reset font-size, color, background-color to allow normal paragraph styling
    const currentTag = currentBlock.tagName.toLowerCase();
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(currentTag)) {
      // Clear inline styles that shouldn't carry over from headings
      newParagraph.style.fontSize = "";
      newParagraph.style.fontWeight = "";
      newParagraph.style.color = "";
      newParagraph.style.backgroundColor = "";
    }

    if (currentBlock.nextSibling) {
      currentBlock.parentNode?.insertBefore(
        newParagraph,
        currentBlock.nextSibling
      );
    } else {
      currentBlock.parentNode?.appendChild(newParagraph);
    }
  };

  /**
   * Handle Enter key when no block element exists
   */
  const handleEnterWithoutBlock = (
    range: Range,
    newParagraph: HTMLParagraphElement
  ) => {
    if (!editorContent.value) return;

    try {
      const beforeRange = document.createRange();
      beforeRange.setStart(editorContent.value, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const beforeContent = beforeRange.extractContents();

      const afterRange = document.createRange();
      afterRange.setStart(range.startContainer, range.startOffset);
      afterRange.setEnd(
        editorContent.value,
        editorContent.value.childNodes.length
      );
      const afterContent = afterRange.extractContents();

      const firstParagraph = document.createElement("p");
      populateNewElement(firstParagraph, beforeContent);
      populateNewElement(newParagraph, afterContent);

      editorContent.value.appendChild(firstParagraph);
      editorContent.value.appendChild(newParagraph);
    } catch (error) {
      console.error("Error handling Enter key:", error);
      newParagraph.innerHTML = "<br>";
      if (editorContent.value.lastChild) {
        editorContent.value.insertBefore(
          newParagraph,
          editorContent.value.lastChild.nextSibling
        );
      } else {
        editorContent.value.appendChild(newParagraph);
      }
    }
  };

  /**
   * Move cursor to the specified element
   */
  const moveCursorToElement = (element: HTMLElement, selection: Selection) => {
    const newRange = document.createRange();
    newRange.setStart(element, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  /**
   * Handle Enter key to create new paragraphs/list items
   */
  const handleEnterKey = (event: KeyboardEvent) => {
    event.preventDefault();
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Delete any selected content first
    if (!range.collapsed) {
      range.deleteContents();
    }

    const { block: currentBlock, tag: currentBlockTag } = findCurrentBlock(
      range.startContainer
    );

    // Handle list items specially
    if (currentBlock && currentBlockTag === "li") {
      handleEnterInListItem(range, currentBlock, selection);
      return;
    }

    // Create new paragraph
    const newParagraph = document.createElement("p");

    if (currentBlock) {
      handleEnterInBlock(range, currentBlock, newParagraph);
    } else {
      handleEnterWithoutBlock(range, newParagraph);
    }

    // Move cursor to new paragraph
    moveCursorToElement(newParagraph, selection);

    if (editorContent.value) {
      editorContent.value.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  /**
   * Handle slash command (/) to open quick actions
   */
  const handleSlashCommand = (event: KeyboardEvent) => {
    const selection = globalThis.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.startContainer;

      // Get the text before the cursor
      let textBefore = "";
      if (container.nodeType === Node.TEXT_NODE) {
        textBefore = (container as Text).data.substring(0, range.startOffset);
      } else if (container.nodeType === Node.ELEMENT_NODE) {
        // If cursor is in an element node, check if it's empty or at the start
        const element = container as HTMLElement;
        const textContent = element.textContent || "";
        textBefore = textContent.substring(0, range.startOffset);
      }

      // Check if we're in a special context
      const inListItem = isInListItem(range);
      const { block: currentBlock } = findCurrentBlock(range.startContainer);

      // Allow slash commands if:
      // 1. Line is empty or whitespace only
      // 2. Text ends with whitespace (space, newline, etc)
      // 3. At the start of a list item or block element
      // 4. In an empty block element (paragraph, heading, etc.)
      const isEmptyLine = textBefore.trim().length === 0;
      const endsWithWhitespace = /\s$/.test(textBefore);
      const isEmptyBlock = currentBlock && isEmptyContent(currentBlock);

      if (
        isEmptyLine ||
        endsWithWhitespace ||
        isEmptyBlock ||
        (inListItem && textBefore.trim() === "")
      ) {
        event.preventDefault();
        event.stopPropagation();
        openCommandMenu();
        return true;
      }
    }
    return false;
  };

  /**
   * Check if the current selection is within a list item
   */
  const isInListItem = (range: Range): boolean => {
    let node: Node | null = range.startContainer;
    while (node && node !== editorContent.value) {
      if (node.nodeName === "LI") {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  /**
   * Handle list indentation/outdentation
   */
  const handleListIndentation = (
    event: KeyboardEvent,
    isShiftKey: boolean
  ): boolean => {
    if (!editorContent.value) return false;

    event.preventDefault();
    const success = isShiftKey
      ? outdentListItem(editorContent.value)
      : indentListItem(editorContent.value);

    if (success) {
      onCaptureSnapshot();
    }
    return true;
  };

  /**
   * Handle Tab/Shift+Tab for list indentation
   */
  const handleTabKey = (event: KeyboardEvent) => {
    if (!editorContent.value) return false;

    const selection = globalThis.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (isInListItem(range)) {
        return handleListIndentation(event, event.shiftKey);
      }
    }
    return false;
  };

  /**
   * Handle undo/redo keyboard shortcuts
   */
  const handleUndoRedo = (event: KeyboardEvent): boolean => {
    const key = event.key.toLowerCase();
    const isModifier = event.ctrlKey || event.metaKey;

    if (isModifier && key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return true;
    }

    if (isModifier && key === "y") {
      event.preventDefault();
      redo();
      return true;
    }

    return false;
  };

  /**
   * Handle text formatting shortcuts (bold, italic, underline)
   */
  const handleTextFormatting = (event: KeyboardEvent): boolean => {
    if (!event.ctrlKey && !event.metaKey) return false;

    const key = event.key.toLowerCase();
    const formatMap: Record<string, string> = {
      b: "strong",
      i: "em",
      u: "u",
    };

    if (formatMap[key]) {
      event.preventDefault();
      handleInlineAction(formatMap[key]);
      return true;
    }

    return false;
  };

  /**
   * Handle heading shortcuts (Ctrl+Alt+1/2/3)
   */
  const handleHeadingShortcuts = (event: KeyboardEvent): boolean => {
    if (!(event.ctrlKey || event.metaKey) || !event.altKey) return false;

    const headingMap: Record<string, string> = {
      "1": "h1",
      "2": "h2",
      "3": "h3",
    };

    if (headingMap[event.key]) {
      event.preventDefault();
      handleBlockAction(headingMap[event.key]);
      return true;
    }

    return false;
  };

  /**
   * Handle special action shortcuts (link, find/replace)
   */
  const handleSpecialActions = (event: KeyboardEvent): boolean => {
    if (!event.ctrlKey && !event.metaKey) return false;

    const key = event.key.toLowerCase();

    if (key === "k") {
      event.preventDefault();
      insertLink();
      return true;
    }

    if (key === "f") {
      event.preventDefault();
      openFindReplaceModal();
      return true;
    }

    return false;
  };

  /**
   * Main keyboard event handler
   */
  const handleKeydown = (event: KeyboardEvent) => {
    // Handle Enter key
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      handleEnterKey(event);
      return;
    }

    // Handle slash command
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      if (handleSlashCommand(event)) return;
    }

    // Handle Tab for list indentation
    if (event.key === "Tab") {
      if (handleTabKey(event)) return;
    }

    // Try each handler in sequence
    if (handleUndoRedo(event)) return;
    if (handleSpecialActions(event)) return;
    if (handleTextFormatting(event)) return;
    if (handleHeadingShortcuts(event)) return;
  };

  return {
    handleKeydown,
  };
}
