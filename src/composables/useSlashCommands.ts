import { ref, reactive, nextTick } from "vue";
import { getSelectionRange } from "../utils/formatting";
import { smoothScrollIntoView } from "../utils/scroll";
import {
  splitBlockAtCaret,
  placeCaretInside,
} from "../utils/blockInsertion";

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
  const commandMenuPosition = ref<{
    top: number;
    left: number;
    maxHeight?: number;
  }>({ top: 0, left: 0 });
  /** Keyboard-highlighted option in the slash menu (Word/Notion parity). */
  const selectedIndex = ref(0);

  // Block-splitting helpers live in utils/blockInsertion.ts — shared with the
  // toolbar's Horizontal Rule so every block inserter avoids <p>-nesting.
  const placeCaret = placeCaretInside;

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
      const tail = splitBlockAtCaret(range, root);
      if (tail?.parentNode) {
        tail.parentNode.insertBefore(quote, tail);
      } else {
        // Caret was not inside a paragraph/heading — already at block level.
        range.insertNode(quote);
      }
      placeCaret(quote, false);
    });
  };

  const insertDivider = () => {
    // Escape the current paragraph first: insertHorizontalRule inserts at the
    // caret, which used to nest the <hr> inside the <p> (invalid HTML).
    let tail: HTMLElement | null = null;
    performWithSelection((root) => {
      const range = getSelectionRange();
      if (!range || !root.contains(range.commonAncestorContainer)) return;
      tail = splitBlockAtCaret(range, root);
    });
    handleInsertHR();
    // Land the caret on the editable line after the divider.
    if (tail) placeCaret(tail, true);
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

  // Conservative menu size used to keep it fully visible before it is measured.
  const MENU_ESTIMATED_HEIGHT = 320;
  const MENU_ESTIMATED_WIDTH = 300;
  const MENU_MARGIN = 8;

  /**
   * Resolve the caret rect for positioning. An empty block returns a 0x0 rect
   * from Range.getBoundingClientRect(), which used to dump the menu at the
   * page's top-left corner — fall back to the caret's closest element rect.
   */
  const getCaretRect = (range: Range): DOMRect => {
    const rect = range.getBoundingClientRect();
    if (rect.width !== 0 || rect.height !== 0 || rect.top !== 0) return rect;
    const node = range.startContainer;
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node.parentElement;
    return element?.getBoundingClientRect() ?? rect;
  };

  /**
   * Clamp the menu into the usable viewport: below the sticky main toolbar,
   * above the fixed mobile toolbar (when present), and inside the horizontal
   * bounds. Without this, on small screens the fixed bars sat on top of the
   * menu and intercepted every click on its items.
   */
  const clampMenuPosition = (viewportTop: number, viewportLeft: number) => {
    const topBar = document
      .querySelector(".editor-toolbar-modern")
      ?.getBoundingClientRect();
    const mobileBar = document
      .querySelector(".mobile-toolbar")
      ?.getBoundingClientRect();

    const minTop = (topBar ? Math.max(0, topBar.bottom) : 0) + MENU_MARGIN;
    const bottomLimit =
      mobileBar && mobileBar.height > 0
        ? mobileBar.top
        : window.innerHeight;
    const maxTop = Math.max(
      minTop,
      bottomLimit - MENU_ESTIMATED_HEIGHT - MENU_MARGIN
    );
    const maxLeft = Math.max(
      MENU_MARGIN,
      window.innerWidth - MENU_ESTIMATED_WIDTH - MENU_MARGIN
    );

    const top = Math.min(Math.max(viewportTop, minTop), maxTop);
    // The menu may not fit at all between the bars (small screens with the
    // mobile toolbar open) — cap its height so it scrolls internally instead
    // of extending underneath the fixed bar, which would intercept clicks.
    const maxHeight = Math.max(160, bottomLimit - top - MENU_MARGIN);

    return {
      top,
      left: Math.min(Math.max(viewportLeft, MENU_MARGIN), maxLeft),
      maxHeight,
    };
  };

  const openCommandMenu = () => {
    nextTick(() => {
      // Remove the slash if it was inserted (in case preventDefault didn't work)
      removeSlashTrigger();

      const range = getSelectionRange();
      if (!range) return;
      const rect = getCaretRect(range);
      const clamped = clampMenuPosition(rect.bottom + 8, rect.left);

      // The menu is position:absolute inside the editor container (its
      // offsetParent, `.next-level-editor` is position:relative), so the
      // viewport-clamped coordinates must be converted into that container's
      // space. Adding window.scrollY here instead produced document-absolute
      // coordinates that re-added the editor's own page offset, dumping the
      // menu below the fold on any page where the editor isn't at the top.
      const startNode = range.startContainer;
      const startElement =
        startNode.nodeType === Node.ELEMENT_NODE
          ? (startNode as HTMLElement)
          : startNode.parentElement;
      const containerRect = startElement
        ?.closest<HTMLElement>(".next-level-editor")
        ?.getBoundingClientRect();

      resetFilter();
      showCommandMenu.value = true;
      commandMenuPosition.value = {
        top: clamped.top - (containerRect ? containerRect.top : -window.scrollY),
        left:
          clamped.left - (containerRect ? containerRect.left : -window.scrollX),
        maxHeight: clamped.maxHeight,
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

  const allCommandOptions: SlashCommandOption[] = [
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
      action: insertDivider,
    },
  ];

  /**
   * Type-to-filter (Notion/Word parity): printable keys typed while the menu
   * is open narrow this list instead of leaking into the document. The
   * reactive array is mutated in place so the menu component sees updates.
   */
  const filterQuery = ref("");
  const commandOptions = reactive<SlashCommandOption[]>([...allCommandOptions]);

  const applyFilter = () => {
    const query = filterQuery.value.trim().toLowerCase();
    const matches = query
      ? allCommandOptions.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            option.description.toLowerCase().includes(query)
        )
      : allCommandOptions;
    commandOptions.splice(0, commandOptions.length, ...matches);
    selectedIndex.value = 0;
  };

  const resetFilter = () => {
    filterQuery.value = "";
    applyFilter();
  };

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
        smoothScrollIntoView(element, { behavior: "smooth", block: "nearest" });
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

  /**
   * Keyboard-drive the open slash menu. Called at the top of the editor's
   * keydown so it wins over the default Enter/Tab behaviour. Returns true when
   * it consumed the event (the caller should then stop further handling).
   */
  const handleMenuKeydown = (event: KeyboardEvent): boolean => {
    if (!showCommandMenu.value) return false;
    const count = commandOptions.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (count > 0) selectedIndex.value = (selectedIndex.value + 1) % count;
        return true;
      case "ArrowUp":
        event.preventDefault();
        if (count > 0) {
          selectedIndex.value = (selectedIndex.value - 1 + count) % count;
        }
        return true;
      case "Enter":
      case "Tab":
        event.preventDefault();
        if (count > 0) {
          handleCommandOption(commandOptions[selectedIndex.value]);
        } else {
          closeCommandMenu();
        }
        return true;
      case "Escape":
        event.preventDefault();
        closeCommandMenu();
        return true;
      case "Backspace":
        // Erase the last filter character; with nothing typed yet, backspace
        // reads as "cancel the menu" (the trigger slash is already gone).
        event.preventDefault();
        if (filterQuery.value) {
          filterQuery.value = filterQuery.value.slice(0, -1);
          applyFilter();
        } else {
          closeCommandMenu();
        }
        return true;
      default:
        break;
    }
    // Type-to-filter: consume printable characters so they narrow the list
    // instead of leaking into the document behind the menu.
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      if (event.key === " " && !filterQuery.value) {
        // Space right after "/" — the user wanted literal text; let it type.
        closeCommandMenu();
        return false;
      }
      event.preventDefault();
      filterQuery.value += event.key;
      applyFilter();
      return true;
    }
    return false;
  };

  return {
    showCommandMenu,
    commandMenuPosition,
    commandOptions,
    selectedIndex,
    openCommandMenu,
    closeCommandMenu,
    handleCommandOption,
    handleMenuKeydown,
    handleDocumentClick,
    handleEscape,
  };
}
