import { computed } from 'vue'

interface CommandPaletteCommandsOptions {
  insertLink: () => void
  insertImage: () => void
  openTableModal: () => void
  openCodeBlockModal: () => void
  toggleEmojiPicker: () => void
  handleInsertHR: () => void
  handleInsertPageBreak: () => void
  handleInsertTOC: () => void
  openFindReplaceModal: () => void
  handleCopyFormat: () => void
  openTemplateModal: () => void
  handleToggleSpellCheck: () => void
  toggleTheme: () => void
  toggleFullScreen: () => void
  handleExportHtml: () => void
  handleExportMarkdown: () => void
  handleExportPdf: () => void
  handleExportWord: () => void
  undo: () => void
  redo: () => void
}

export interface CommandPaletteCommand {
  id: string
  name: string
  description: string
  icon: string
  category: string
  shortcut?: string
  action: () => void
}

/**
 * Composable for generating command palette commands
 * Provides all available commands organized by category
 */
export function useCommandPaletteCommands(options: CommandPaletteCommandsOptions) {
  const {
    insertLink,
    insertImage,
    openTableModal,
    openCodeBlockModal,
    toggleEmojiPicker,
    handleInsertHR,
    handleInsertPageBreak,
    handleInsertTOC,
    openFindReplaceModal,
    handleCopyFormat,
    openTemplateModal,
    handleToggleSpellCheck,
    toggleTheme,
    toggleFullScreen,
    handleExportHtml,
    handleExportMarkdown,
    handleExportPdf,
    handleExportWord,
    undo,
    redo,
  } = options

  /**
   * All available commands for the command palette
   * Organized by category for easy filtering and discovery
   */
  const commands = computed<CommandPaletteCommand[]>(() => [
    // Formatting Commands
    {
      id: 'format-bold',
      name: 'Bold',
      description: 'Make selected text bold',
      icon: '**B**',
      category: 'Formatting',
      shortcut: 'Ctrl+B',
      action: () => document.execCommand('bold'),
    },
    {
      id: 'format-italic',
      name: 'Italic',
      description: 'Make selected text italic',
      icon: '*I*',
      category: 'Formatting',
      shortcut: 'Ctrl+I',
      action: () => document.execCommand('italic'),
    },
    {
      id: 'format-underline',
      name: 'Underline',
      description: 'Underline selected text',
      icon: '__U__',
      category: 'Formatting',
      shortcut: 'Ctrl+U',
      action: () => document.execCommand('underline'),
    },
    // Heading Commands
    {
      id: 'heading-1',
      name: 'Heading 1',
      description: 'Large heading',
      icon: 'H1',
      category: 'Structure',
      shortcut: 'Ctrl+Alt+1',
      action: () => document.execCommand('formatBlock', false, 'h1'),
    },
    {
      id: 'heading-2',
      name: 'Heading 2',
      description: 'Medium heading',
      icon: 'H2',
      category: 'Structure',
      shortcut: 'Ctrl+Alt+2',
      action: () => document.execCommand('formatBlock', false, 'h2'),
    },
    {
      id: 'heading-3',
      name: 'Heading 3',
      description: 'Small heading',
      icon: 'H3',
      category: 'Structure',
      shortcut: 'Ctrl+Alt+3',
      action: () => document.execCommand('formatBlock', false, 'h3'),
    },
    // List Commands
    {
      id: 'list-bullet',
      name: 'Bullet List',
      description: 'Create an unordered list',
      icon: '•',
      category: 'Lists',
      action: () => document.execCommand('insertUnorderedList'),
    },
    {
      id: 'list-numbered',
      name: 'Numbered List',
      description: 'Create an ordered list',
      icon: '1.',
      category: 'Lists',
      action: () => document.execCommand('insertOrderedList'),
    },
    // Insert Commands
    {
      id: 'insert-link',
      name: 'Insert Link',
      description: 'Add a hyperlink',
      icon: '🔗',
      category: 'Insert',
      shortcut: 'Ctrl+K',
      action: insertLink,
    },
    {
      id: 'insert-image',
      name: 'Insert Image',
      description: 'Add an image',
      icon: '🖼️',
      category: 'Insert',
      action: insertImage,
    },
    {
      id: 'insert-table',
      name: 'Insert Table',
      description: 'Add a table',
      icon: '⊞',
      category: 'Insert',
      action: openTableModal,
    },
    {
      id: 'insert-code',
      name: 'Code Block',
      description: 'Insert code with syntax highlighting',
      icon: '</>',
      category: 'Insert',
      action: openCodeBlockModal,
    },
    {
      id: 'insert-emoji',
      name: 'Insert Emoji',
      description: 'Add an emoji',
      icon: '😀',
      category: 'Insert',
      action: toggleEmojiPicker,
    },
    {
      id: 'insert-hr',
      name: 'Horizontal Rule',
      description: 'Insert a dividing line',
      icon: '—',
      category: 'Insert',
      action: handleInsertHR,
    },
    {
      id: 'insert-page-break',
      name: 'Page Break',
      description: 'Insert a page break',
      icon: '📄',
      category: 'Insert',
      action: handleInsertPageBreak,
    },
    {
      id: 'insert-toc',
      name: 'Table of Contents',
      description: 'Generate table of contents',
      icon: '📑',
      category: 'Insert',
      action: handleInsertTOC,
    },
    // Tools
    {
      id: 'find-replace',
      name: 'Find & Replace',
      description: 'Search and replace text',
      icon: '🔍',
      category: 'Tools',
      shortcut: 'Ctrl+F',
      action: openFindReplaceModal,
    },
    {
      id: 'format-painter-copy',
      name: 'Copy Format',
      description: 'Copy text formatting',
      icon: '🖌️',
      category: 'Tools',
      action: handleCopyFormat,
    },
    {
      id: 'templates',
      name: 'Templates',
      description: 'Choose a document template',
      icon: '📚',
      category: 'Tools',
      action: openTemplateModal,
    },
    {
      id: 'toggle-spell-check',
      name: 'Toggle Spell Check',
      description: 'Enable or disable spell checking',
      icon: 'Aa',
      category: 'Tools',
      action: handleToggleSpellCheck,
    },
    // View
    {
      id: 'toggle-theme',
      name: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: '🌓',
      category: 'View',
      action: toggleTheme,
    },
    {
      id: 'fullscreen',
      name: 'Toggle Fullscreen',
      description: 'Enter or exit fullscreen mode',
      icon: '⛶',
      category: 'View',
      action: toggleFullScreen,
    },
    // Export
    {
      id: 'export-html',
      name: 'Export as HTML',
      description: 'Download document as HTML',
      icon: '📄',
      category: 'Export',
      action: handleExportHtml,
    },
    {
      id: 'export-markdown',
      name: 'Export as Markdown',
      description: 'Download document as Markdown',
      icon: '📝',
      category: 'Export',
      action: handleExportMarkdown,
    },
    {
      id: 'export-pdf',
      name: 'Export as PDF',
      description: 'Download document as PDF',
      icon: '📕',
      category: 'Export',
      action: handleExportPdf,
    },
    {
      id: 'export-word',
      name: 'Export as Word',
      description: 'Download document as Word document',
      icon: '📘',
      category: 'Export',
      action: handleExportWord,
    },
    // History
    {
      id: 'undo',
      name: 'Undo',
      description: 'Undo last action',
      icon: '⟲',
      category: 'History',
      shortcut: 'Ctrl+Z',
      action: undo,
    },
    {
      id: 'redo',
      name: 'Redo',
      description: 'Redo last undone action',
      icon: '⟳',
      category: 'History',
      shortcut: 'Ctrl+Shift+Z',
      action: redo,
    },
  ])

  return {
    commands,
  }
}
