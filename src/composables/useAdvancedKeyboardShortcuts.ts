import { type Ref } from "vue";
import {
  useShortcutRegistry,
  type Shortcut,
  type ShortcutCategory,
} from "./useShortcutRegistry";

/**
 * Interface for shortcut actions provided by editor
 */
export interface ShortcutActions {
  // Text Formatting
  bold: () => void;
  italic: () => void;
  underline: () => void;
  strikethrough: () => void;
  code: () => void;
  superscript: () => void;
  subscript: () => void;
  clearFormatting: () => void;

  // Block Formatting
  paragraph: () => void;
  heading1: () => void;
  heading2: () => void;
  heading3: () => void;
  heading4: () => void;
  heading5: () => void;
  heading6: () => void;
  blockquote: () => void;
  codeBlock: () => void;

  // Lists
  bulletList: () => void;
  numberedList: () => void;
  checkList: () => void;
  indent: () => void;
  outdent: () => void;

  // Alignment
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignJustify: () => void;

  // Insertion
  insertLink: () => void;
  insertImage: () => void;
  insertTable: () => void;
  insertHorizontalRule: () => void;
  insertEmoji: () => void;
  insertCodeBlock: () => void;

  // Selection & Navigation
  selectAll: () => void;
  selectLine: () => void;
  selectWord: () => void;
  goToLineStart: () => void;
  goToLineEnd: () => void;
  goToDocStart: () => void;
  goToDocEnd: () => void;
  moveCursorUp: () => void;
  moveCursorDown: () => void;
  moveCursorLeft: () => void;
  moveCursorRight: () => void;
  moveWordLeft: () => void;
  moveWordRight: () => void;

  // Editing
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  pasteWithoutFormatting: () => void;
  duplicate: () => void;
  deleteLine: () => void;
  deleteWord: () => void;

  // Search & Replace
  find: () => void;
  replace: () => void;
  findNext: () => void;
  findPrevious: () => void;

  // View & UI
  toggleFullscreen: () => void;
  togglePreview: () => void;
  toggleSidebar: () => void;
  toggleToolbar: () => void;
  toggleLineNumbers: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;

  // Special
  openCommandPalette: () => void;
  openShortcutHelp: () => void;
  save: () => void;
  export: () => void;
  print: () => void;
}

/**
 * Professional keyboard shortcuts system
 * 80+ shortcuts inspired by Word, VS Code, Google Docs
 */
export function useAdvancedKeyboardShortcuts(
  _editorContent: Ref<HTMLDivElement | null>,
  actions: Partial<ShortcutActions>
) {
  const registry = useShortcutRegistry();

  /**
   * Register all shortcut categories
   */
  const registerCategories = () => {
    const categories: ShortcutCategory[] = [
      {
        id: "formatting",
        name: "Text Formatting",
        description: "Bold, italic, underline, and other text styles",
        icon: "format_bold",
      },
      {
        id: "blocks",
        name: "Block Formatting",
        description: "Paragraphs, headings, quotes, and code blocks",
        icon: "text_fields",
      },
      {
        id: "lists",
        name: "Lists",
        description: "Bullet lists, numbered lists, and indentation",
        icon: "format_list_bulleted",
      },
      {
        id: "alignment",
        name: "Alignment",
        description: "Text alignment options",
        icon: "format_align_left",
      },
      {
        id: "insertion",
        name: "Insertion",
        description: "Insert links, images, tables, and other content",
        icon: "add_circle",
      },
      {
        id: "selection",
        name: "Selection & Navigation",
        description: "Select text and move cursor",
        icon: "select_all",
      },
      {
        id: "editing",
        name: "Editing",
        description: "Undo, redo, cut, copy, paste, and delete",
        icon: "edit",
      },
      {
        id: "search",
        name: "Search & Replace",
        description: "Find and replace text",
        icon: "search",
      },
      {
        id: "view",
        name: "View & UI",
        description: "Toggle views, zoom, and UI elements",
        icon: "visibility",
      },
      {
        id: "special",
        name: "Special Actions",
        description: "Command palette, help, save, export",
        icon: "star",
      },
    ];

    categories.forEach((cat) => registry.registerCategory(cat));
  };

  /**
   * Create action wrapper that prevents default and executes action. The
   * returned handler is tagged with `hasFn` so shortcuts wired to a real editor
   * action can be told apart from the ones left unimplemented (Partial actions)
   * — the latter are DISABLED after registration so they neither fire (native
   * behaviour, e.g. Ctrl+C, is preserved) nor appear in the help modal, which
   * only ever shows shortcuts that actually work.
   */
  const createAction = (fn?: () => void) => {
    const handler = ((event: KeyboardEvent): boolean => {
      if (fn) {
        event.preventDefault();
        fn();
        return true;
      }
      return false;
    }) as ((event: KeyboardEvent) => boolean) & { hasFn: boolean };
    handler.hasFn = Boolean(fn);
    return handler;
  };

  /**
   * Register all 80+ shortcuts
   */
  const registerShortcuts = () => {
    const shortcuts: Shortcut[] = [
      // ===== TEXT FORMATTING =====
      {
        id: "bold",
        category: "formatting",
        description: "Bold",
        keys: ["ctrl+b", "cmd+b"],
        action: createAction(actions.bold),
        enabled: true,
        customizable: true,
      },
      {
        id: "italic",
        category: "formatting",
        description: "Italic",
        keys: ["ctrl+i", "cmd+i"],
        action: createAction(actions.italic),
        enabled: true,
        customizable: true,
      },
      {
        id: "underline",
        category: "formatting",
        description: "Underline",
        keys: ["ctrl+u", "cmd+u"],
        action: createAction(actions.underline),
        enabled: true,
        customizable: true,
      },
      {
        id: "strikethrough",
        category: "formatting",
        description: "Strikethrough",
        keys: ["ctrl+shift+x", "cmd+shift+x"],
        action: createAction(actions.strikethrough),
        enabled: true,
        customizable: true,
      },
      {
        id: "code",
        category: "formatting",
        description: "Inline Code",
        keys: ["ctrl+e", "cmd+e"],
        action: createAction(actions.code),
        enabled: true,
        customizable: true,
      },
      {
        id: "superscript",
        category: "formatting",
        description: "Superscript",
        keys: ["ctrl+shift+.", "cmd+shift+."],
        action: createAction(actions.superscript),
        enabled: true,
        customizable: true,
      },
      {
        id: "subscript",
        category: "formatting",
        description: "Subscript",
        keys: ["ctrl+shift+,", "cmd+shift+,"],
        action: createAction(actions.subscript),
        enabled: true,
        customizable: true,
      },
      {
        id: "clearFormatting",
        category: "formatting",
        description: "Clear Formatting",
        keys: ["ctrl+\\", "cmd+\\"],
        action: createAction(actions.clearFormatting),
        enabled: true,
        customizable: true,
      },

      // ===== BLOCK FORMATTING =====
      {
        id: "paragraph",
        category: "blocks",
        description: "Convert to Paragraph",
        keys: ["ctrl+alt+0", "cmd+alt+0"],
        action: createAction(actions.paragraph),
        enabled: true,
        customizable: true,
      },
      {
        id: "heading1",
        category: "blocks",
        description: "Heading 1",
        keys: ["ctrl+alt+1", "cmd+alt+1"],
        action: createAction(actions.heading1),
        enabled: true,
        customizable: true,
      },
      {
        id: "heading2",
        category: "blocks",
        description: "Heading 2",
        keys: ["ctrl+alt+2", "cmd+alt+2"],
        action: createAction(actions.heading2),
        enabled: true,
        customizable: true,
      },
      {
        id: "heading3",
        category: "blocks",
        description: "Heading 3",
        keys: ["ctrl+alt+3", "cmd+alt+3"],
        action: createAction(actions.heading3),
        enabled: true,
        customizable: true,
      },
      {
        id: "heading4",
        category: "blocks",
        description: "Heading 4",
        keys: ["ctrl+alt+4", "cmd+alt+4"],
        action: createAction(actions.heading4),
        enabled: true,
        customizable: true,
      },
      {
        id: "heading5",
        category: "blocks",
        description: "Heading 5",
        keys: ["ctrl+alt+5", "cmd+alt+5"],
        action: createAction(actions.heading5),
        enabled: true,
        customizable: true,
      },
      {
        id: "heading6",
        category: "blocks",
        description: "Heading 6",
        keys: ["ctrl+alt+6", "cmd+alt+6"],
        action: createAction(actions.heading6),
        enabled: true,
        customizable: true,
      },
      {
        id: "blockquote",
        category: "blocks",
        description: "Blockquote",
        keys: ["ctrl+shift+q", "cmd+shift+q"],
        action: createAction(actions.blockquote),
        enabled: true,
        customizable: true,
      },
      {
        id: "codeBlock",
        category: "blocks",
        description: "Code Block",
        keys: ["ctrl+alt+c", "cmd+alt+c"],
        action: createAction(actions.codeBlock),
        enabled: true,
        customizable: true,
      },

      // ===== LISTS =====
      {
        id: "bulletList",
        category: "lists",
        description: "Bullet List",
        keys: ["ctrl+shift+8", "cmd+shift+8"],
        action: createAction(actions.bulletList),
        enabled: true,
        customizable: true,
      },
      {
        id: "numberedList",
        category: "lists",
        description: "Numbered List",
        keys: ["ctrl+shift+7", "cmd+shift+7"],
        action: createAction(actions.numberedList),
        enabled: true,
        customizable: true,
      },
      {
        id: "checkList",
        category: "lists",
        description: "Checklist",
        keys: ["ctrl+shift+9", "cmd+shift+9"],
        action: createAction(actions.checkList),
        enabled: true,
        customizable: true,
      },
      {
        id: "indent",
        category: "lists",
        description: "Indent",
        keys: ["tab"],
        action: createAction(actions.indent),
        enabled: true,
        customizable: false, // Tab is special
      },
      {
        id: "outdent",
        category: "lists",
        description: "Outdent",
        keys: ["shift+tab"],
        action: createAction(actions.outdent),
        enabled: true,
        customizable: false, // Shift+Tab is special
      },

      // ===== ALIGNMENT =====
      {
        id: "alignLeft",
        category: "alignment",
        description: "Align Left",
        keys: ["ctrl+shift+l", "cmd+shift+l"],
        action: createAction(actions.alignLeft),
        enabled: true,
        customizable: true,
      },
      {
        id: "alignCenter",
        category: "alignment",
        description: "Align Center",
        keys: ["ctrl+shift+e", "cmd+shift+e"],
        action: createAction(actions.alignCenter),
        enabled: true,
        customizable: true,
      },
      {
        id: "alignRight",
        category: "alignment",
        description: "Align Right",
        keys: ["ctrl+shift+r", "cmd+shift+r"],
        action: createAction(actions.alignRight),
        enabled: true,
        customizable: true,
      },
      {
        id: "alignJustify",
        category: "alignment",
        description: "Align Justify",
        keys: ["ctrl+shift+j", "cmd+shift+j"],
        action: createAction(actions.alignJustify),
        enabled: true,
        customizable: true,
      },

      // ===== INSERTION =====
      {
        id: "insertLink",
        category: "insertion",
        description: "Insert Link",
        keys: ["ctrl+k", "cmd+k"],
        action: createAction(actions.insertLink),
        enabled: true,
        customizable: true,
      },
      {
        id: "insertImage",
        category: "insertion",
        description: "Insert Image",
        keys: ["ctrl+shift+i", "cmd+shift+i"],
        action: createAction(actions.insertImage),
        enabled: true,
        customizable: true,
      },
      {
        id: "insertTable",
        category: "insertion",
        description: "Insert Table",
        keys: ["ctrl+shift+t", "cmd+shift+t"],
        action: createAction(actions.insertTable),
        enabled: true,
        customizable: true,
      },
      {
        id: "insertHorizontalRule",
        category: "insertion",
        description: "Insert Horizontal Rule",
        keys: ["ctrl+shift+h", "cmd+shift+h"],
        action: createAction(actions.insertHorizontalRule),
        enabled: true,
        customizable: true,
      },
      {
        id: "insertEmoji",
        category: "insertion",
        description: "Insert Emoji",
        keys: ["ctrl+shift+m", "cmd+shift+m"],
        action: createAction(actions.insertEmoji),
        enabled: true,
        customizable: true,
      },

      // ===== SELECTION & NAVIGATION =====
      {
        id: "selectAll",
        category: "selection",
        description: "Select All",
        keys: ["ctrl+a", "cmd+a"],
        action: createAction(actions.selectAll),
        enabled: true,
        customizable: true,
      },
      {
        id: "selectLine",
        category: "selection",
        description: "Select Line",
        keys: ["ctrl+l", "cmd+l"],
        action: createAction(actions.selectLine),
        enabled: true,
        customizable: true,
      },
      {
        id: "selectWord",
        category: "selection",
        description: "Select Word",
        keys: ["ctrl+d", "cmd+d"],
        action: createAction(actions.selectWord),
        enabled: true,
        customizable: true,
      },
      {
        id: "goToLineStart",
        category: "selection",
        description: "Go to Line Start",
        keys: ["home"],
        action: createAction(actions.goToLineStart),
        enabled: true,
        customizable: false,
      },
      {
        id: "goToLineEnd",
        category: "selection",
        description: "Go to Line End",
        keys: ["end"],
        action: createAction(actions.goToLineEnd),
        enabled: true,
        customizable: false,
      },
      {
        id: "goToDocStart",
        category: "selection",
        description: "Go to Document Start",
        keys: ["ctrl+home", "cmd+arrowup"],
        action: createAction(actions.goToDocStart),
        enabled: true,
        customizable: true,
      },
      {
        id: "goToDocEnd",
        category: "selection",
        description: "Go to Document End",
        keys: ["ctrl+end", "cmd+arrowdown"],
        action: createAction(actions.goToDocEnd),
        enabled: true,
        customizable: true,
      },
      {
        id: "moveWordLeft",
        category: "selection",
        description: "Move Word Left",
        keys: ["ctrl+arrowleft", "alt+arrowleft"],
        action: createAction(actions.moveWordLeft),
        enabled: true,
        customizable: true,
      },
      {
        id: "moveWordRight",
        category: "selection",
        description: "Move Word Right",
        keys: ["ctrl+arrowright", "alt+arrowright"],
        action: createAction(actions.moveWordRight),
        enabled: true,
        customizable: true,
      },

      // ===== EDITING =====
      {
        id: "undo",
        category: "editing",
        description: "Undo",
        keys: ["ctrl+z", "cmd+z"],
        action: createAction(actions.undo),
        enabled: true,
        customizable: true,
      },
      {
        id: "redo",
        category: "editing",
        description: "Redo",
        keys: ["ctrl+y", "cmd+shift+z"],
        action: createAction(actions.redo),
        enabled: true,
        customizable: true,
      },
      {
        id: "cut",
        category: "editing",
        description: "Cut",
        keys: ["ctrl+x", "cmd+x"],
        action: createAction(actions.cut),
        enabled: true,
        customizable: true,
      },
      {
        id: "copy",
        category: "editing",
        description: "Copy",
        keys: ["ctrl+c", "cmd+c"],
        action: createAction(actions.copy),
        enabled: true,
        customizable: true,
      },
      {
        id: "paste",
        category: "editing",
        description: "Paste",
        keys: ["ctrl+v", "cmd+v"],
        action: createAction(actions.paste),
        enabled: true,
        customizable: true,
      },
      {
        id: "pasteWithoutFormatting",
        category: "editing",
        description: "Paste without Formatting",
        keys: ["ctrl+shift+v", "cmd+shift+v"],
        action: createAction(actions.pasteWithoutFormatting),
        enabled: true,
        customizable: true,
      },
      {
        id: "duplicate",
        category: "editing",
        description: "Duplicate Line/Selection",
        keys: ["ctrl+shift+d", "cmd+shift+d"],
        action: createAction(actions.duplicate),
        enabled: true,
        customizable: true,
      },
      {
        id: "deleteLine",
        category: "editing",
        description: "Delete Line",
        keys: ["ctrl+shift+k", "cmd+shift+k"],
        action: createAction(actions.deleteLine),
        enabled: true,
        customizable: true,
      },
      {
        id: "deleteWord",
        category: "editing",
        description: "Delete Word",
        keys: ["ctrl+backspace", "alt+backspace"],
        action: createAction(actions.deleteWord),
        enabled: true,
        customizable: true,
      },

      // ===== SEARCH & REPLACE =====
      {
        id: "find",
        category: "search",
        description: "Find",
        keys: ["ctrl+f", "cmd+f"],
        action: createAction(actions.find),
        enabled: true,
        customizable: true,
      },
      {
        id: "replace",
        category: "search",
        description: "Replace",
        keys: ["ctrl+h", "cmd+h"],
        action: createAction(actions.replace),
        enabled: true,
        customizable: true,
      },
      {
        id: "findNext",
        category: "search",
        description: "Find Next",
        keys: ["f3", "cmd+g"],
        action: createAction(actions.findNext),
        enabled: true,
        customizable: true,
      },
      {
        id: "findPrevious",
        category: "search",
        description: "Find Previous",
        keys: ["shift+f3", "cmd+shift+g"],
        action: createAction(actions.findPrevious),
        enabled: true,
        customizable: true,
      },

      // ===== VIEW & UI =====
      {
        id: "toggleFullscreen",
        category: "view",
        description: "Toggle Fullscreen",
        keys: ["f11"],
        action: createAction(actions.toggleFullscreen),
        enabled: true,
        customizable: true,
      },
      {
        id: "togglePreview",
        category: "view",
        description: "Toggle Preview",
        keys: ["ctrl+shift+p", "cmd+shift+p"],
        action: createAction(actions.togglePreview),
        enabled: true,
        customizable: true,
      },
      {
        id: "toggleSidebar",
        category: "view",
        description: "Toggle Sidebar",
        keys: ["ctrl+b", "cmd+b"],
        action: createAction(actions.toggleSidebar),
        enabled: false, // Disabled by default (conflicts with bold)
        customizable: true,
      },
      {
        id: "toggleToolbar",
        category: "view",
        description: "Toggle Toolbar",
        keys: ["ctrl+shift+/", "cmd+shift+/"],
        action: createAction(actions.toggleToolbar),
        enabled: true,
        customizable: true,
      },
      {
        id: "zoomIn",
        category: "view",
        description: "Zoom In",
        keys: ["ctrl++", "cmd++"],
        action: createAction(actions.zoomIn),
        enabled: true,
        customizable: true,
      },
      {
        id: "zoomOut",
        category: "view",
        description: "Zoom Out",
        keys: ["ctrl+-", "cmd+-"],
        action: createAction(actions.zoomOut),
        enabled: true,
        customizable: true,
      },
      {
        id: "zoomReset",
        category: "view",
        description: "Reset Zoom",
        keys: ["ctrl+0", "cmd+0"],
        action: createAction(actions.zoomReset),
        enabled: true,
        customizable: true,
      },

      // ===== SPECIAL ACTIONS =====
      {
        id: "openCommandPalette",
        category: "special",
        description: "Command Palette",
        keys: ["ctrl+shift+p", "cmd+shift+p"],
        action: createAction(actions.openCommandPalette),
        enabled: false, // Conflicts with togglePreview - user chooses
        customizable: true,
      },
      {
        id: "openShortcutHelp",
        category: "special",
        description: "Keyboard Shortcuts Help",
        keys: ["ctrl+/", "cmd+/"],
        action: createAction(actions.openShortcutHelp),
        enabled: true,
        customizable: true,
      },
      {
        id: "save",
        category: "special",
        description: "Save",
        keys: ["ctrl+s", "cmd+s"],
        action: createAction(actions.save),
        enabled: true,
        customizable: true,
      },
      {
        id: "export",
        category: "special",
        description: "Export",
        keys: ["ctrl+shift+s", "cmd+shift+s"],
        action: createAction(actions.export),
        enabled: true,
        customizable: true,
      },
      {
        id: "print",
        category: "special",
        description: "Print",
        keys: ["ctrl+p", "cmd+p"],
        action: createAction(actions.print),
        enabled: true,
        customizable: true,
      },
    ];

    shortcuts.forEach((s) => registry.registerShortcut(s));
  };

  /**
   * Main keyboard event handler
   */
  const handleKeydown = (event: KeyboardEvent) => {
    return registry.handleKeyboardEvent(event);
  };

  // Initialize
  registerCategories();
  registerShortcuts();

  // Disable every shortcut with no backing editor action. These stay out of the
  // active key handler (so the browser's native behaviour is untouched) and out
  // of the help modal (which filters on `enabled`), so the system only ever
  // advertises shortcuts that genuinely fire.
  for (const shortcut of registry.getAllShortcuts()) {
    const action = shortcut.action as ((event: KeyboardEvent) => boolean) & {
      hasFn?: boolean;
    };
    if (!action.hasFn) {
      registry.disableShortcut(shortcut.id);
    }
  }

  return {
    handleKeydown,
    registry,
  };
}
