import { ref, computed } from "vue";

/**
 * Content context types that the smart toolbar can detect
 */
export type ContentContext =
  | "text"
  | "heading"
  | "list"
  | "link"
  | "image"
  | "table"
  | "code"
  | "empty"
  | "mixed";

/**
 * Detected element information
 */
export interface DetectedElement {
  type: ContentContext;
  element: HTMLElement;
  depth: number;
}

/**
 * Multi-context detection result
 */
export interface MultiContextResult {
  primaryContext: ContentContext;
  detectedElements: DetectedElement[];
  isMixed: boolean;
  cursorContext: ContentContext;
}

/**
 * Toolbar visibility configuration
 */
export interface ToolbarConfig {
  format: boolean;
  textFormatting: boolean;
  alignment: boolean;
  lists: boolean;
  insert: boolean;
  colors: boolean;
  link: boolean;
  tools: boolean;
  view: boolean;
  export: boolean;
}

/**
 * Smart toolbar state
 */
export interface SmartToolbarState {
  context: ContentContext;
  config: ToolbarConfig;
  isFloating: boolean;
  isSticky: boolean;
}

/**
 * Default toolbar configurations for different contexts
 */
const contextConfigs: Record<ContentContext, ToolbarConfig> = {
  // An empty document keeps the full formatting palette enabled: collapsed-
  // caret formatting (click Bold, then type bold) is standard editor behavior,
  // so greying the toolbar out on first run just reads as broken chrome.
  empty: {
    format: true,
    textFormatting: true,
    alignment: true,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  text: {
    format: true,
    textFormatting: true,
    alignment: true,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  heading: {
    format: true,
    textFormatting: true,
    alignment: true,
    // Lists are enabled so a heading can be converted into a list (#18)
    lists: true,
    // Insert stays available in every context — inserting a table/image/HR
    // while the caret sits in a heading is a completely normal action, and a
    // toolbar section that flickers between enabled/disabled as the caret
    // moves reads as broken chrome.
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  list: {
    format: true,
    textFormatting: true,
    // Alignment is enabled inside lists because applyTextAlignment supports <li> (#8)
    alignment: true,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  // A link always lives inside a block (paragraph/heading/list item), so
  // block-level operations on that container — format, alignment, lists,
  // inserts — remain perfectly valid while the caret is on the link.
  link: {
    format: true,
    textFormatting: true,
    alignment: true,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  image: {
    format: false,
    textFormatting: false,
    alignment: true,
    lists: false,
    insert: true,
    colors: false,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  table: {
    format: false,
    textFormatting: true,
    alignment: true,
    lists: false,
    insert: true,
    colors: true,
    // Links inside table cells are ordinary rich-text content.
    link: true,
    tools: true,
    view: true,
    export: true,
  },
  // Code blocks intentionally reject inline styling (bold/colors/links) to
  // keep their content plain, but block-level insertion stays available —
  // the insert utilities place new blocks after the <pre>, never inside it.
  code: {
    format: false,
    textFormatting: false,
    alignment: false,
    lists: false,
    insert: true,
    colors: false,
    link: false,
    tools: true,
    view: true,
    export: true,
  },
  mixed: {
    format: true,
    textFormatting: true,
    alignment: true,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true,
  },
};

/**
 * Composable for smart toolbar context detection and configuration
 */
export function useSmartToolbar() {
  const context = ref<ContentContext>("empty");
  // The editor from the most recent updateContext(), so getDetailedContext()
  // can resolve the live cursor context instead of hardcoding "empty".
  let lastEditor: HTMLElement | null = null;
  const isFloating = ref(false);
  const isSticky = ref(false);
  const customConfig = ref<Partial<ToolbarConfig> | null>(null);
  const detectedElements = ref<DetectedElement[]>([]);
  const isMixedSelection = ref(false);

  /**
   * Get the toolbar configuration for the current context
   */
  const config = computed<ToolbarConfig>(() => {
    const baseConfig = contextConfigs[context.value];
    if (customConfig.value) {
      return { ...baseConfig, ...customConfig.value };
    }
    return baseConfig;
  });

  /**
   * Check if element matches a specific context type
   */
  const getElementContextType = (element: HTMLElement): ContentContext => {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "img") return "image";
    if (tagName === "code" || tagName === "pre") return "code";
    if (tagName === "table" || tagName === "td" || tagName === "th")
      return "table";
    if (tagName === "a") return "link";
    if (/^h[1-6]$/.test(tagName)) return "heading";
    if (tagName === "ul" || tagName === "ol" || tagName === "li") return "list";

    return "text";
  };

  /**
   * Walk up DOM tree and collect all matching context elements
   */
  const collectContextElements = (
    node: Node | null,
    editor: HTMLElement | null
  ): DetectedElement[] => {
    const elements: DetectedElement[] = [];
    let element: HTMLElement | null = null;

    if (node?.nodeType === Node.TEXT_NODE) {
      element = node.parentElement;
    } else if (node instanceof HTMLElement) {
      element = node;
    }

    let depth = 0;
    while (element && element !== editor && editor?.contains(element)) {
      const contextType = getElementContextType(element);
      elements.push({ type: contextType, element, depth });
      element = element.parentElement;
      depth++;
    }

    return elements;
  };

  /**
   * Determine primary context from detected elements
   */
  const determinePrimaryContext = (
    elements: DetectedElement[]
  ): ContentContext => {
    if (elements.length === 0) return "text";

    // Priority: image > code > table > link > list > heading > text
    const contextPriority: Record<ContentContext, number> = {
      image: 10,
      code: 9,
      table: 8,
      link: 7,
      list: 6,
      heading: 5,
      text: 1,
      empty: 0,
      mixed: 2,
    };

    let maxPriority = -1;
    let primaryContext: ContentContext = "text";

    elements.forEach((el) => {
      const priority = contextPriority[el.type];
      if (priority > maxPriority) {
        maxPriority = priority;
        primaryContext = el.type;
      }
    });

    return primaryContext;
  };

  /**
   * Detect multiple contexts in the selection
   */
  const detectMultipleContexts = (
    editor: HTMLElement | null
  ): MultiContextResult => {
    if (!editor) {
      return {
        primaryContext: "empty",
        detectedElements: [],
        isMixed: false,
        cursorContext: "empty",
      };
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return {
        primaryContext: "empty",
        detectedElements: [],
        isMixed: false,
        cursorContext: "empty",
      };
    }

    const range = selection.getRangeAt(0);

    // Check if a single element node is selected (e.g., selectNode on img/table)
    let allElements: DetectedElement[] = [];

    if (
      range.startContainer === range.endContainer &&
      range.startContainer.childNodes.length > 0 &&
      range.endOffset - range.startOffset === 1
    ) {
      const selectedNode = range.startContainer.childNodes[range.startOffset];
      if (selectedNode instanceof HTMLElement) {
        const contextType = getElementContextType(selectedNode);
        allElements = [{ type: contextType, element: selectedNode, depth: 0 }];
      }
    }

    // If no single element selected, collect from start and end containers
    if (allElements.length === 0) {
      const startElements = collectContextElements(
        range.startContainer,
        editor
      );
      const endElements = collectContextElements(range.endContainer, editor);

      // Combine and deduplicate detected elements
      allElements = [...startElements];
      endElements.forEach((el) => {
        if (!allElements.some((e) => e.element === el.element)) {
          allElements.push(el);
        }
      });
    }

    const primaryContext = determinePrimaryContext(allElements);
    const isMixed =
      allElements.length > 1 &&
      new Set(allElements.map((e) => e.type)).size > 1;

    // Determine cursor context (where the cursor actually is)
    const cursorElements = collectContextElements(range.startContainer, editor);
    const cursorContext = determinePrimaryContext(cursorElements);

    return {
      primaryContext,
      detectedElements: allElements,
      isMixed,
      cursorContext,
    };
  };

  /**
   * Detect content context from the current selection or cursor position
   */
  const detectContext = (editor: HTMLElement | null): ContentContext => {
    if (!editor) return "empty";

    // Check if editor is empty
    if (editor.textContent?.trim() === "") return "empty";

    // Check if there's a valid selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return "empty";
    }

    const multiContextResult = detectMultipleContexts(editor);
    return multiContextResult.primaryContext;
  };

  /**
   * Update the current context based on the editor state
   */
  const updateContext = (editor: HTMLElement | null) => {
    // Remember the editor so getDetailedContext() can resolve the live cursor
    // context — it used to hardcode getCursorContext(null) and so always
    // reported cursorContext:"empty" regardless of the caret.
    lastEditor = editor;
    if (!editor) {
      context.value = "empty";
      detectedElements.value = [];
      isMixedSelection.value = false;
      return;
    }

    // Check if editor is empty
    if (editor.textContent?.trim() === "") {
      context.value = "empty";
      detectedElements.value = [];
      isMixedSelection.value = false;
      return;
    }

    // Check if there's a valid selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      context.value = "empty";
      detectedElements.value = [];
      isMixedSelection.value = false;
      return;
    }

    const result = detectMultipleContexts(editor);
    context.value = result.isMixed ? "mixed" : result.primaryContext;
    detectedElements.value = result.detectedElements;
    isMixedSelection.value = result.isMixed;
  };

  /**
   * Get the primary context at cursor position
   */
  const getCursorContext = (editor: HTMLElement | null): ContentContext => {
    if (!editor) return "empty";
    const result = detectMultipleContexts(editor);
    return result.cursorContext;
  };

  /**
   * Set floating toolbar mode
   */
  const setFloating = (floating: boolean) => {
    isFloating.value = floating;
  };

  /**
   * Set sticky toolbar mode
   */
  const setSticky = (sticky: boolean) => {
    isSticky.value = sticky;
  };

  /**
   * Apply custom toolbar configuration
   */
  const setCustomConfig = (config: Partial<ToolbarConfig> | null) => {
    customConfig.value = config;
  };

  /**
   * Reset to default configuration
   */
  const resetConfig = () => {
    customConfig.value = null;
  };

  /**
   * Check if a specific toolbar section should be visible
   */
  const isVisible = (section: keyof ToolbarConfig): boolean => {
    return config.value[section];
  };

  /**
   * Get context-specific suggestions or hints
   */
  const getContextHints = (): string[] => {
    switch (context.value) {
      case "empty":
        return ["Start typing or use Insert menu to add content"];
      case "heading":
        return [
          "Headings help structure your document",
          "Use for section titles",
        ];
      case "list":
        return ["Press Tab to indent", "Press Shift+Tab to outdent"];
      case "link":
        return ["✏️ Edit link (Cmd/Ctrl+K)"];
      case "image":
        return ["🖼️ Click image to resize or align"];
      case "table":
        return [
          "📊 Use Tab to navigate cells",
          "Right-click for table options",
        ];
      case "code":
        return ["💻 Code block formatting disabled", "Preserves indentation"];
      case "mixed":
        return ["📦 Multiple element types selected", "Use toolbar to format"];
      case "text":
      default:
        return [];
    }
  };

  /**
   * Get detailed context information for debugging/development
   */
  const getDetailedContext = (): {
    primaryContext: ContentContext;
    cursorContext: ContentContext;
    isMixed: boolean;
    elementCount: number;
    elementTypes: ContentContext[];
  } => {
    const elementTypes = detectedElements.value.map((e) => e.type);
    const uniqueTypes = Array.from(new Set(elementTypes));

    return {
      primaryContext: context.value,
      cursorContext: getCursorContext(lastEditor),
      isMixed: isMixedSelection.value,
      elementCount: detectedElements.value.length,
      elementTypes: uniqueTypes,
    };
  };

  return {
    context: computed(() => context.value),
    config,
    isFloating: computed(() => isFloating.value),
    isSticky: computed(() => isSticky.value),
    isMixedSelection: computed(() => isMixedSelection.value),
    detectedElements: computed(() => detectedElements.value),
    detectContext,
    detectMultipleContexts,
    updateContext,
    getCursorContext,
    getElementContextType,
    setFloating,
    setSticky,
    setCustomConfig,
    resetConfig,
    isVisible,
    getContextHints,
    getDetailedContext,
  };
}
