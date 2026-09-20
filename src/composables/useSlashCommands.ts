import { ref, reactive, computed, watch, nextTick, type Ref } from "vue";
import { getSelectionRange } from "../utils/formatting";
import { smoothScrollIntoView } from "../utils/scroll";
import {
  splitBlockAtCaret,
  placeCaretInside,
} from "../utils/blockInsertion";
import { clampMenuToViewport } from "../utils/menuPosition";
import { nextInstanceToken } from "../utils/instanceToken";

export interface SlashCommandOption {
  id: string;
  label: string;
  description: string;
  action: () => void;
  /**
   * Shortcut text that summons this command ("/tbl"). Plugin slash commands
   * document it in their public type; the filter matches it alongside
   * label/description. #R24-19
   */
  trigger?: string;
  /**
   * True when the action only OPENS a modal (Link, Image, Table, Code Block).
   * Nothing has been applied yet, so the "X applied" toast is suppressed — the
   * modal itself is the feedback.
   */
  opensModal?: boolean;
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
  /**
   * This editor's root element, so the menu is clamped against ITS toolbar and
   * not another editor's further down the page. #R23-7
   */
  editorRoot?: Ref<HTMLElement | null>;
  /**
   * Slash commands contributed by plugins. Appended after the built-ins, so a
   * plugin extends the menu instead of competing with it, and they filter with
   * everything else. #R23-45
   */
  pluginSlashCommands?: Ref<SlashCommandOption[]>;
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
    editorRoot,
    pluginSlashCommands,
  } = options;

  const showCommandMenu = ref(false);
  const commandMenuPosition = ref<{
    top: number;
    left: number;
    maxHeight?: number;
  }>({ top: 0, left: 0 });
  /** Keyboard-highlighted option in the slash menu (Word/Notion parity). */
  const selectedIndex = ref(0);

  // Ids wiring the menu to the element that actually HAS focus — the editing
  // surface. Focus never enters the menu, so without aria-controls /
  // aria-activedescendant on the surface the listbox is invisible to assistive
  // tech no matter how well the menu itself is marked up. Globally unique (not
  // Vue's per-app useId) so two editors in separate apps cannot collide.
  // #R23-5
  const menuUid = nextInstanceToken("nle-slash");
  const menuListboxId = `${menuUid}-listbox`;
  const menuOptionId = (index: number): string => `${menuUid}-option-${index}`;
  const activeOptionId = computed(() =>
    showCommandMenu.value && commandOptions.length > 0
      ? menuOptionId(selectedIndex.value)
      : undefined
  );

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
   * bounds. Shared with the variable autocomplete via clampMenuToViewport.
   */
  const clampMenuPosition = (viewportTop: number, viewportLeft: number) =>
    clampMenuToViewport(viewportTop, viewportLeft, {
      estimatedWidth: MENU_ESTIMATED_WIDTH,
      estimatedHeight: MENU_ESTIMATED_HEIGHT,
      margin: MENU_MARGIN,
      root: editorRoot?.value ?? null,
    });

  const openCommandMenu = () => {
    nextTick(() => {
      // Remove the slash if it was inserted (in case preventDefault didn't work)
      removeSlashTrigger();

      const range = getSelectionRange();
      if (!range) return;
      const rect = getCaretRect(range);
      const clamped = clampMenuPosition(rect.bottom + 8, rect.left);

      // Teleported to body with fixed positioning: viewport coordinates avoid
      // clipping when a small screen forces the menu above the editor shell.
      resetFilter();
      showCommandMenu.value = true;
      commandMenuPosition.value = {
        top: clamped.top,
        left: clamped.left,
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
      opensModal: true,
    },
    {
      id: "slash-link",
      label: "Link",
      description: "Insert a hyperlink",
      action: insertLink,
      opensModal: true,
    },
    {
      id: "slash-image",
      label: "Image",
      description: "Insert an image",
      action: insertImage,
      opensModal: true,
    },
    {
      id: "slash-table",
      label: "Table",
      description: "Insert a table",
      action: openTableModal,
      opensModal: true,
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

  /** Built-ins plus any plugin-contributed commands, read fresh each time so a
   * plugin registered after mount still appears. #R23-45 */
  const availableCommandOptions = (): SlashCommandOption[] =>
    pluginSlashCommands?.value?.length
      ? [...allCommandOptions, ...pluginSlashCommands.value]
      : allCommandOptions;

  const commandOptions = reactive<SlashCommandOption[]>([
    ...availableCommandOptions(),
  ]);

  const applyFilter = () => {
    const query = filterQuery.value.trim().toLowerCase();
    const all = availableCommandOptions();
    const matches = query
      ? all.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            option.description.toLowerCase().includes(query) ||
            option.trigger?.toLowerCase().includes(query)
        )
      : all;
    commandOptions.splice(0, commandOptions.length, ...matches);
    selectedIndex.value = 0;
  };

  const resetFilter = () => {
    filterQuery.value = "";
    applyFilter();
  };

  // Plugins register AFTER this composable is created (the host's list is
  // installed on mount), and a host may swap its plugins at runtime — so the
  // live option list has to follow them, not just the seed. #R23-45
  if (pluginSlashCommands) {
    watch(pluginSlashCommands, () => applyFilter(), { deep: true });
  }

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

    // Toast only for commands that actually applied content. A modal-opener
    // (Link/Image/Table/Code Block) hasn't applied anything yet — claiming
    // "Table applied" the moment its dialog opens is a lie.
    if (showToast && !option.opensModal) {
      showToast(`${option.label} applied`, "success");
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
        // Space right after "/" — the user wanted literal text, not a command.
        // openCommandMenu already deleted the trigger "/" from the document, so
        // simply letting the space type would leave " " with the slash gone.
        // Restore the "/" at the caret; the browser then types the space after
        // it, yielding the literal "/ " the user intended.
        closeCommandMenu();
        const selection = globalThis.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const slash = document.createTextNode("/");
          range.insertNode(slash);
          range.setStartAfter(slash);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
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
    menuListboxId,
    menuOptionId,
    activeOptionId,
    openCommandMenu,
    closeCommandMenu,
    handleCommandOption,
    handleMenuKeydown,
    handleDocumentClick,
    handleEscape,
  };
}
