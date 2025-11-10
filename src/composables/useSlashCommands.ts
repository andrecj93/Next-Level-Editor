import { ref, nextTick } from "vue";
import { getSelectionRange } from "../utils/formatting";

export interface SlashCommandOption {
  id: string;
  label: string;
  description: string;
  action: () => void;
}

export interface UseSlashCommandsOptions {
  handleInlineAction: (tag: string) => void;
  handleBlockAction: (tag: string) => void;
  handleListAction: (tag: "ul" | "ol") => void;
  insertLink: () => void;
  insertImage: () => void;
  openTableModal: () => void;
  openCodeBlockModal: () => void;
  handleInsertHR: () => void;
  performWithSelection: (callback: (root: HTMLElement) => void) => void;
  showToast?: (message: string, type?: "success" | "error") => void;
}

export function useSlashCommands(options: UseSlashCommandsOptions) {
  const {
    handleInlineAction,
    handleBlockAction,
    handleListAction,
    insertLink,
    insertImage,
    openTableModal,
    openCodeBlockModal,
    handleInsertHR,
    performWithSelection,
    showToast,
  } = options;

  const showCommandMenu = ref(false);
  const commandMenuPosition = ref({ top: 0, left: 0 });

  const insertBlockquote = () => {
    performWithSelection((root) => {
      const range = getSelectionRange();
      if (!range || !root.contains(range.commonAncestorContainer)) return;
      const quote = document.createElement("blockquote");
      const content = range.cloneContents();
      if (content.textContent?.trim()) {
        quote.appendChild(content);
      } else {
        quote.textContent = "Type your quote here";
      }
      range.deleteContents();
      range.insertNode(quote);
    });
  };

  const removeSlashTrigger = () => {
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      const textNode = container as Text;
      // Check both at cursor position and one position before
      const currentIndex = range.startOffset;
      const beforeIndex = currentIndex - 1;

      // Remove slash at current position if present
      if (
        currentIndex < textNode.length &&
        textNode.data[currentIndex] === "/"
      ) {
        textNode.deleteData(currentIndex, 1);
      }

      // Also check and remove slash before cursor (in case it was just inserted)
      if (beforeIndex >= 0 && textNode.data[beforeIndex] === "/") {
        textNode.deleteData(beforeIndex, 1);
        const newRange = document.createRange();
        newRange.setStart(textNode, beforeIndex);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  };

  const openCommandMenu = () => {
    nextTick(() => {
      // Remove the slash if it was inserted (in case preventDefault didn't work)
      removeSlashTrigger();

      const range = getSelectionRange();
      if (!range) return;
      const rect = range.getBoundingClientRect();
      showCommandMenu.value = true;
      commandMenuPosition.value = {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      };
    });
  };

  const closeCommandMenu = () => {
    showCommandMenu.value = false;
  };

  const handleDocumentClick = (event: MouseEvent) => {
    if (!showCommandMenu.value) return;
    const target = event.target as HTMLElement;
    if (!target.closest(".command-menu")) {
      closeCommandMenu();
    }
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeCommandMenu();
    }
  };

  const commandOptions: SlashCommandOption[] = [
    {
      id: "slash-h1",
      label: "Heading 1",
      description: "Large section heading",
      action: () => handleBlockAction("h1"),
    },
    {
      id: "slash-h2",
      label: "Heading 2",
      description: "Medium section heading",
      action: () => handleBlockAction("h2"),
    },
    {
      id: "slash-h3",
      label: "Heading 3",
      description: "Small section heading",
      action: () => handleBlockAction("h3"),
    },
    {
      id: "slash-paragraph",
      label: "Paragraph",
      description: "Regular text paragraph",
      action: () => handleBlockAction("p"),
    },
    {
      id: "slash-bold",
      label: "Bold",
      description: "Make text bold",
      action: () => handleInlineAction("strong"),
    },
    {
      id: "slash-italic",
      label: "Italic",
      description: "Make text italic",
      action: () => handleInlineAction("em"),
    },
    {
      id: "slash-bullet",
      label: "Bullet List",
      description: "Create an unordered list",
      action: () => handleListAction("ul"),
    },
    {
      id: "slash-numbered",
      label: "Numbered List",
      description: "Create an ordered list",
      action: () => handleListAction("ol"),
    },
    {
      id: "slash-quote",
      label: "Quote",
      description: "Insert a blockquote",
      action: insertBlockquote,
    },
    {
      id: "slash-code",
      label: "Code Block",
      description: "Insert code with syntax highlighting",
      action: openCodeBlockModal,
    },
    {
      id: "slash-link",
      label: "Link",
      description: "Insert a hyperlink",
      action: insertLink,
    },
    {
      id: "slash-image",
      label: "Image",
      description: "Insert an image",
      action: insertImage,
    },
    {
      id: "slash-table",
      label: "Table",
      description: "Insert a table",
      action: openTableModal,
    },
    {
      id: "slash-divider",
      label: "Divider",
      description: "Insert horizontal rule",
      action: handleInsertHR,
    },
  ];

  /**
   * Scroll to the current selection/element
   */
  const scrollToSelection = () => {
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;

    let element: HTMLElement | null = null;
    if (container.nodeType === Node.ELEMENT_NODE) {
      element = container as HTMLElement;
    } else if (container.parentElement) {
      element = container.parentElement;
    }

    if (element) {
      // Use requestAnimationFrame instead of nextTick for better performance
      requestAnimationFrame(() => {
        element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  const handleCommandOption = (option: SlashCommandOption) => {
    // Slash trigger already removed when menu opened
    option.action();
    closeCommandMenu();

    // Scroll to the new element and show feedback
    // Use immediate scroll instead of delayed scroll
    scrollToSelection();

    // Optional: Show toast notification
    if (showToast) {
      const actionName = option.label;
      showToast(`${actionName} applied`, "success");
    }
  };

  return {
    showCommandMenu,
    commandMenuPosition,
    commandOptions,
    openCommandMenu,
    closeCommandMenu,
    handleCommandOption,
    handleDocumentClick,
    handleEscape,
  };
}
