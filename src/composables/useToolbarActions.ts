import { computed, type Ref } from 'vue'
import type { ToolbarAction } from '../types/toolbar'

export interface UseToolbarActionsOptions {
  // Action handlers
  handleInlineAction: (tag: string) => void
  handleBlockAction: (tag: string) => void
  handleListAction: (tag: 'ul' | 'ol') => void
  handleTextAlignment: (alignment: 'left' | 'center' | 'right' | 'justify') => void
  handleFontSize: (size: 'small' | 'normal' | 'large' | 'huge') => void
  insertLink: () => void
  insertImage: () => void
  openFileManagerModal: () => void
  openEmbedModal: () => void
  openTableModal: () => void
  openCodeBlockModal: () => void
  handleInsertHR: () => void
  handleInsertPageBreak: () => void
  handleInsertTOC: () => void
  toggleEmojiPicker: () => void
  openHtmlCodeModal: () => void
  openFindReplaceModal: () => void
  handleToggleSpellCheck: () => void
  handleExportHtml: () => void
  handleExportMarkdown: () => void
  handleExportPdf: () => void
  handleExportWord: () => void
  toggleFullScreen: () => void
  handleCopyFormat: () => void
  handlePasteFormat: () => void
  openTemplateModal: () => void

  // Active state checkers
  isInlineActionActive: (tag: string) => boolean
  isBlockActionActive: (tag: string) => boolean
  isListActionActive: (tag: 'ul' | 'ol') => boolean

  // State refs
  fontSize: Ref<'small' | 'normal' | 'large' | 'huge'>
  spellCheckEnabled: Ref<boolean>
  isFullScreen: Ref<boolean>
  hasFormatCopied: () => boolean
}

export function useToolbarActions(options: UseToolbarActionsOptions) {
  const {
    handleInlineAction,
    handleBlockAction,
    handleListAction,
    handleTextAlignment,
    handleFontSize,
    insertLink,
    insertImage,
    openFileManagerModal,
    openEmbedModal,
    openTableModal,
    openCodeBlockModal,
    handleInsertHR,
    handleInsertPageBreak,
    handleInsertTOC,
    toggleEmojiPicker,
    openHtmlCodeModal,
    openFindReplaceModal,
    handleToggleSpellCheck,
    handleExportHtml,
    handleExportMarkdown,
    handleExportPdf,
    handleExportWord,
    toggleFullScreen,
    handleCopyFormat,
    handlePasteFormat,
    openTemplateModal,
    isInlineActionActive,
    isBlockActionActive,
    isListActionActive,
    fontSize,
    spellCheckEnabled,
    isFullScreen,
    hasFormatCopied,
  } = options

  const formatDropdownItems = computed(() => [
    {
      id: 'paragraph',
      label: 'Paragraph',
      icon: '¶',
      onClick: () => handleBlockAction('p'),
      isActive: () => isBlockActionActive('p'),
    },
    { divider: true },
    {
      id: 'h1',
      label: 'Heading 1',
      icon: 'H1',
      shortcut: 'Ctrl+Alt+1',
      onClick: () => handleBlockAction('h1'),
      isActive: () => isBlockActionActive('h1'),
    },
    {
      id: 'h2',
      label: 'Heading 2',
      icon: 'H2',
      shortcut: 'Ctrl+Alt+2',
      onClick: () => handleBlockAction('h2'),
      isActive: () => isBlockActionActive('h2'),
    },
    {
      id: 'h3',
      label: 'Heading 3',
      icon: 'H3',
      shortcut: 'Ctrl+Alt+3',
      onClick: () => handleBlockAction('h3'),
      isActive: () => isBlockActionActive('h3'),
    },
  ])

  const inlineFormatActions = computed<ToolbarAction[]>(() => [
    {
      id: 'bold',
      label: 'Bold',
      icon: '<strong>B</strong>',
      tooltip: 'Bold (Ctrl+B)',
      onClick: () => handleInlineAction('strong'),
      isActive: () => isInlineActionActive('strong'),
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: '<em>I</em>',
      tooltip: 'Italic (Ctrl+I)',
      onClick: () => handleInlineAction('em'),
      isActive: () => isInlineActionActive('em'),
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: '<u>U</u>',
      tooltip: 'Underline (Ctrl+U)',
      onClick: () => handleInlineAction('u'),
      isActive: () => isInlineActionActive('u'),
    },
    {
      id: 'strike',
      label: 'Strikethrough',
      icon: '<s>S</s>',
      tooltip: 'Strikethrough',
      onClick: () => handleInlineAction('s'),
      isActive: () => isInlineActionActive('s'),
    },
  ])

  const alignmentDropdownItems = computed(() => [
    {
      id: 'align-left',
      label: 'Align Left',
      icon: '⬅',
      onClick: () => handleTextAlignment('left'),
    },
    {
      id: 'align-center',
      label: 'Center',
      icon: '↔',
      onClick: () => handleTextAlignment('center'),
    },
    {
      id: 'align-right',
      label: 'Align Right',
      icon: '➡',
      onClick: () => handleTextAlignment('right'),
    },
    {
      id: 'align-justify',
      label: 'Justify',
      icon: '⬌',
      onClick: () => handleTextAlignment('justify'),
    },
  ])

  const fontSizeDropdownItems = computed(() => [
    {
      id: 'size-small',
      label: 'Small',
      onClick: () => handleFontSize('small'),
      isActive: () => fontSize.value === 'small',
    },
    {
      id: 'size-normal',
      label: 'Normal',
      onClick: () => handleFontSize('normal'),
      isActive: () => fontSize.value === 'normal',
    },
    {
      id: 'size-large',
      label: 'Large',
      onClick: () => handleFontSize('large'),
      isActive: () => fontSize.value === 'large',
    },
    {
      id: 'size-huge',
      label: 'Huge',
      onClick: () => handleFontSize('huge'),
      isActive: () => fontSize.value === 'huge',
    },
  ])

  const listActions = computed<ToolbarAction[]>(() => [
    {
      id: 'bullet-list',
      label: 'Bullet List',
      icon: '• List',
      tooltip: 'Bullet list',
      onClick: () => handleListAction('ul'),
      isActive: () => isListActionActive('ul'),
    },
    {
      id: 'numbered-list',
      label: 'Numbered List',
      icon: '1. List',
      tooltip: 'Numbered list',
      onClick: () => handleListAction('ol'),
      isActive: () => isListActionActive('ol'),
    },
  ])

  const insertDropdownItems = computed(() => [
    {
      id: 'link',
      label: 'Link',
      icon: '🔗',
      shortcut: 'Ctrl+K',
      onClick: insertLink,
    },
    {
      id: 'image',
      label: 'Image',
      icon: '🖼️',
      onClick: insertImage,
    },
    {
      id: 'file-manager',
      label: 'File Manager',
      icon: '📁',
      onClick: openFileManagerModal,
    },
    {
      id: 'video',
      label: 'Video',
      icon: '🎬',
      onClick: openEmbedModal,
    },
    { divider: true },
    {
      id: 'table',
      label: 'Table',
      icon: '⊞',
      onClick: openTableModal,
    },
    {
      id: 'code',
      label: 'Code Block',
      icon: '</>',
      onClick: openCodeBlockModal,
    },
    {
      id: 'hr',
      label: 'Horizontal Rule',
      icon: '—',
      onClick: handleInsertHR,
    },
    {
      id: 'page-break',
      label: 'Page Break',
      icon: '📄',
      onClick: handleInsertPageBreak,
    },
    {
      id: 'toc',
      label: 'Table of Contents',
      icon: '📑',
      onClick: handleInsertTOC,
    },
    {
      id: 'emoji',
      label: 'Emoji',
      icon: '😀',
      onClick: toggleEmojiPicker,
    },
  ])

  const toolActions = computed<ToolbarAction[]>(() => [
    {
      id: 'view-html',
      label: 'View HTML Code',
      icon: '💻',
      tooltip: 'View formatted HTML code',
      onClick: openHtmlCodeModal,
    },
    {
      id: 'find',
      label: 'Find & Replace',
      icon: '🔍',
      tooltip: 'Find & Replace (Ctrl+F)',
      onClick: openFindReplaceModal,
    },
    {
      id: 'spell-check-toggle',
      label: 'Toggle Spell Check',
      icon: spellCheckEnabled.value ? '✓' : 'Aa',
      tooltip: spellCheckEnabled.value ? 'Disable Spell Check' : 'Enable Spell Check',
      onClick: handleToggleSpellCheck,
      isActive: () => spellCheckEnabled.value,
    },
    {
      id: 'export-html',
      label: 'Export HTML',
      icon: '📄',
      tooltip: 'Export as HTML',
      onClick: handleExportHtml,
    },
    {
      id: 'export-md',
      label: 'Export Markdown',
      icon: '📝',
      tooltip: 'Export as Markdown',
      onClick: handleExportMarkdown,
    },
    {
      id: 'export-pdf',
      label: 'Export PDF',
      icon: '📕',
      tooltip: 'Export as PDF',
      onClick: handleExportPdf,
    },
    {
      id: 'export-word',
      label: 'Export Word',
      icon: '📘',
      tooltip: 'Export as Word',
      onClick: handleExportWord,
    },
    {
      id: 'fullscreen',
      label: 'Fullscreen',
      icon: '⛶',
      tooltip: 'Toggle fullscreen',
      onClick: toggleFullScreen,
      isActive: () => isFullScreen.value,
    },
  ])

  const productivityDropdownItems = computed(() => [
    {
      id: 'format-painter-copy',
      label: 'Copy Format',
      icon: '🖌️',
      onClick: handleCopyFormat,
    },
    {
      id: 'format-painter-paste',
      label: 'Paste Format',
      icon: '📋',
      onClick: handlePasteFormat,
      disabled: !hasFormatCopied(),
    },
    { divider: true },
    {
      id: 'spell-check',
      label: spellCheckEnabled.value ? 'Disable Spell Check' : 'Enable Spell Check',
      icon: spellCheckEnabled.value ? '✓' : '✗',
      onClick: handleToggleSpellCheck,
    },
    { divider: true },
    {
      id: 'templates',
      label: 'Templates',
      icon: '📚',
      onClick: openTemplateModal,
    },
  ])

  return {
    formatDropdownItems,
    inlineFormatActions,
    alignmentDropdownItems,
    fontSizeDropdownItems,
    listActions,
    insertDropdownItems,
    toolActions,
    productivityDropdownItems,
  }
}
