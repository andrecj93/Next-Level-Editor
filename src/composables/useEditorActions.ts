import { ref, type Ref } from 'vue'
import {
  applyInlineStyle,
  insertImage as insertImageUtil,
  insertLink as insertLinkUtil,
  toggleBlock,
  toggleList,
} from '../utils/formatting'
import {
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
  insertHorizontalRule,
  insertTable as insertTableUtil,
  searchAndReplace,
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  deleteTable,
  applyCellProperties,
  applyTableProperties,
  getCellProperties,
  getTableProperties,
} from '../utils/commands'
import { exportAsHtml, exportAsMarkdown, exportAsPdf, formatHtml, exportAsWord } from '../utils/export'
import { copyFormat, pasteFormat } from '../utils/formatPainter'
import { insertPageBreak, insertTableOfContents } from '../utils/pageManagement'
import { toggleSpellCheck } from '../utils/spellChecker'

export interface UseEditorActionsOptions {
  editorContent: Ref<HTMLDivElement | null>
  performWithSelection: (callback: (root: HTMLElement) => void) => void
  captureSnapshot: () => void
  emit: (event: string, ...args: any[]) => void
}

export function useEditorActions(options: UseEditorActionsOptions) {
  const { editorContent, performWithSelection, captureSnapshot, emit } = options

  // Modal states
  const showImageUploadModal = ref(false)
  const showEmbedModal = ref(false)
  const showFileManagerModal = ref(false)
  const showEmojiPicker = ref(false)
  const showTemplateModal = ref(false)
  const showHtmlCodeModal = ref(false)
  const showFindReplaceModal = ref(false)
  const showCodeBlockModal = ref(false)
  const showTableModal = ref(false)
  const showTableDesigner = ref(false)
  const showTablePropertiesModal = ref(false)

  // State
  const fontSize = ref<'small' | 'normal' | 'large' | 'huge'>('normal')
  const spellCheckEnabled = ref(false)
  const isFullScreen = ref(false)
  const formatPainterActive = ref(false)
  const currentTable = ref<HTMLTableElement | null>(null)
  const currentCell = ref<HTMLTableCellElement | null>(null)
  const tableDesignerPosition = ref({ x: 0, y: 0 })
  const tablePropertiesMode = ref<'cell' | 'table' | 'both'>('both')
  const initialCellProps = ref({})
  const initialTableProps = ref({})

  // Basic formatting actions
  const handleInlineAction = (tag: string) => {
    performWithSelection((root) => applyInlineStyle(root, tag))
  }

  const handleBlockAction = (tag: string, fallback = 'p') => {
    performWithSelection((root) => toggleBlock(root, tag, fallback))
  }

  const handleListAction = (tag: 'ul' | 'ol') => {
    performWithSelection((root) => toggleList(root, tag))
  }

  // Text styling
  const handleTextAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    performWithSelection((root) => applyTextAlignment(root, alignment))
  }

  const handleTextColor = (color: string) => {
    performWithSelection((root) => applyTextColor(root, color))
  }

  const handleBackgroundColor = (color: string) => {
    performWithSelection((root) => applyBackgroundColor(root, color))
  }

  const handleFontSize = (size: 'small' | 'normal' | 'large' | 'huge') => {
    fontSize.value = size
    performWithSelection((root) => applyFontSize(root, size))
  }

  // Link and image insertion
  const insertLink = () => {
    const url = prompt('Enter the URL:')
    if (url) {
      performWithSelection((root) => insertLinkUtil(root, url))
    }
  }

  const insertImage = () => {
    showImageUploadModal.value = true
  }

  const handleInsertImage = (url: string, alt: string) => {
    performWithSelection((root) => insertImageUtil(root, url, alt))
    showImageUploadModal.value = false
  }

  const closeImageUploadModal = () => {
    showImageUploadModal.value = false
  }

  // Embed modal
  const openEmbedModal = () => {
    showEmbedModal.value = true
  }

  const handleInsertEmbed = (html: string) => {
    if (!editorContent.value) return
    performWithSelection(() => {
      const selection = window.getSelection()
      if (!selection || !selection.rangeCount) return

      const range = selection.getRangeAt(0)
      range.deleteContents()

      const temp = document.createElement('div')
      temp.innerHTML = html

      const fragment = document.createDocumentFragment()
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild)
      }
      range.insertNode(fragment)

      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    })
    showEmbedModal.value = false
  }

  const closeEmbedModal = () => {
    showEmbedModal.value = false
  }

  // File manager
  const openFileManagerModal = () => {
    showFileManagerModal.value = true
  }

  const closeFileManagerModal = () => {
    showFileManagerModal.value = false
  }

  const handleInsertFile = (file: any) => {
    if (!editorContent.value) return

    if (file.type.startsWith('image/')) {
      performWithSelection((root) => insertImageUtil(root, file.url, file.name))
    } else {
      performWithSelection(() => {
        const selection = window.getSelection()
        if (!selection || !selection.rangeCount) return

        const range = selection.getRangeAt(0)
        const link = document.createElement('a')
        link.href = file.url
        link.textContent = file.name
        link.download = file.name
        link.target = '_blank'

        range.deleteContents()
        range.insertNode(link)
        range.collapse(false)
      })
    }

    showFileManagerModal.value = false
  }

  // Emoji picker
  const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  const handleInsertEmoji = (emoji: string) => {
    performWithSelection(() => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const textNode = document.createTextNode(emoji)

      range.deleteContents()
      range.insertNode(textNode)

      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    })

    showEmojiPicker.value = false
  }

  // Template modal
  const openTemplateModal = () => {
    showTemplateModal.value = true
  }

  const closeTemplateModal = () => {
    showTemplateModal.value = false
  }

  const handleSelectTemplate = (template: any) => {
    if (editorContent.value) {
      editorContent.value.innerHTML = template.content
      captureSnapshot()
    }
  }

  // HTML code modal
  const openHtmlCodeModal = () => {
    showHtmlCodeModal.value = true
  }

  const closeHtmlCodeModal = () => {
    showHtmlCodeModal.value = false
  }

  // Page management
  const handleInsertPageBreak = () => {
    if (!editorContent.value) return
    const selection = window.getSelection()
    insertPageBreak(selection)
    captureSnapshot()
  }

  const handleInsertTOC = () => {
    if (!editorContent.value) return
    const selection = window.getSelection()
    insertTableOfContents(editorContent.value, selection)
    captureSnapshot()
  }

  // Spell check
  const handleToggleSpellCheck = () => {
    if (!editorContent.value) return
    const newState = toggleSpellCheck(editorContent.value)
    spellCheckEnabled.value = newState
  }

  // Horizontal rule
  const handleInsertHR = () => {
    performWithSelection(() => insertHorizontalRule())
  }

  // Table operations
  const openTableModal = () => {
    showTableModal.value = true
  }

  const closeTableModal = () => {
    showTableModal.value = false
  }

  const handleInsertTable = (data: { rows: number; cols: number; includeHeader: boolean }) => {
    performWithSelection((root) => insertTableUtil(root, data.rows, data.cols, data.includeHeader))
  }

  const handleAddRowAbove = () => {
    if (!currentTable.value || !currentCell.value) return
    const row = currentCell.value.parentElement as HTMLTableRowElement
    const tbody = row.parentElement as HTMLTableSectionElement
    if (!tbody) return

    const rowIndex = Array.from(tbody.rows).indexOf(row)
    addTableRow(currentTable.value, rowIndex)
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  const handleAddRowBelow = () => {
    if (!currentTable.value || !currentCell.value) return
    const row = currentCell.value.parentElement as HTMLTableRowElement
    const tbody = row.parentElement as HTMLTableSectionElement
    if (!tbody) return

    const rowIndex = Array.from(tbody.rows).indexOf(row)
    addTableRow(currentTable.value, rowIndex + 1)
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  const handleAddColumnLeft = () => {
    if (!currentTable.value || !currentCell.value) return
    const cellIndex = Array.from(currentCell.value.parentElement?.children || []).indexOf(currentCell.value)
    addTableColumn(currentTable.value, cellIndex)
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  const handleAddColumnRight = () => {
    if (!currentTable.value || !currentCell.value) return
    const cellIndex = Array.from(currentCell.value.parentElement?.children || []).indexOf(currentCell.value)
    addTableColumn(currentTable.value, cellIndex + 1)
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  const handleRemoveRow = () => {
    if (!currentTable.value || !currentCell.value) return
    const row = currentCell.value.parentElement as HTMLTableRowElement
    const tbody = row.parentElement as HTMLTableSectionElement
    if (!tbody) return

    const rowIndex = Array.from(tbody.rows).indexOf(row)
    removeTableRow(currentTable.value, rowIndex)
    showTableDesigner.value = false
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  const handleRemoveColumn = () => {
    if (!currentTable.value || !currentCell.value) return
    const cellIndex = Array.from(currentCell.value.parentElement?.children || []).indexOf(currentCell.value)
    removeTableColumn(currentTable.value, cellIndex)
    showTableDesigner.value = false
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  const handleDeleteTable = () => {
    if (!currentTable.value) return
    deleteTable(currentTable.value)
    showTableDesigner.value = false
    currentTable.value = null
    currentCell.value = null
    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  // Table properties
  const handleCellProperties = () => {
    if (!currentCell.value) return

    initialCellProps.value = getCellProperties(currentCell.value)
    tablePropertiesMode.value = 'cell'
    showTablePropertiesModal.value = true
  }

  const handleTableProperties = () => {
    if (!currentTable.value) return

    initialTableProps.value = getTableProperties(currentTable.value)
    tablePropertiesMode.value = 'table'
    showTablePropertiesModal.value = true
  }

  const closeTablePropertiesModal = () => {
    showTablePropertiesModal.value = false
  }

  const handleApplyTableProperties = (data: {
    cellProps?: {
      backgroundColor?: string
      textAlign?: string
      verticalAlign?: string
      padding?: number
      width?: string
      height?: string
    }
    tableProps?: {
      borderStyle?: string
      borderWidth?: number
      borderColor?: string
      width?: string
      backgroundColor?: string
      borderCollapse?: boolean
    }
  }) => {
    if (data.cellProps && currentCell.value) {
      applyCellProperties(currentCell.value, data.cellProps)
    }

    if (data.tableProps && currentTable.value) {
      applyTableProperties(currentTable.value, data.tableProps)
    }

    emit('update:modelValue', editorContent.value?.innerHTML || '')
  }

  // Find & Replace
  const openFindReplaceModal = () => {
    showFindReplaceModal.value = true
  }

  const closeFindReplaceModal = () => {
    showFindReplaceModal.value = false
  }

  const handleFind = (data: { findText: string; direction: 'next' | 'previous' }) => {
    if (!editorContent.value) return

    const selection = window.getSelection()
    if (!selection) return

    window.find(data.findText, false, data.direction === 'previous', false, false, true, false)
  }

  const handleReplace = (data: { findText: string; replaceText: string; options: { caseSensitive: boolean; wholeWord: boolean } }) => {
    if (!editorContent.value) return

    const html = editorContent.value.innerHTML
    const newHtml = searchAndReplace(html, data.findText, data.replaceText, data.options)
    editorContent.value.innerHTML = newHtml
    captureSnapshot()
  }

  // Code block
  const openCodeBlockModal = () => {
    showCodeBlockModal.value = true
  }

  const closeCodeBlockModal = () => {
    showCodeBlockModal.value = false
  }

  const handleInsertCodeBlock = (data: { code: string; language: string }) => {
    performWithSelection(() => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)

      const pre = document.createElement('pre')
      pre.style.margin = '16px 0'

      const code = document.createElement('code')
      code.className = `language-${data.language}`
      code.textContent = data.code

      pre.appendChild(code)

      range.deleteContents()
      range.insertNode(pre)

      const newRange = document.createRange()
      newRange.setStartAfter(pre)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)
    })
  }

  // Export
  const handleExportHtml = () => {
    if (!editorContent.value) return
    exportAsHtml(editorContent.value.innerHTML)
  }

  const handleExportMarkdown = () => {
    if (!editorContent.value) return
    exportAsMarkdown(editorContent.value.innerHTML)
  }

  const handleFormatHtml = () => {
    if (!editorContent.value) return
    const formatted = formatHtml(editorContent.value.innerHTML)
    editorContent.value.innerHTML = formatted
    captureSnapshot()
  }

  const handleExportPdf = async () => {
    if (!editorContent.value) return
    try {
      await exportAsPdf(editorContent.value)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }

  const handleExportWord = async () => {
    if (!editorContent.value) return
    try {
      await exportAsWord(editorContent.value.innerHTML)
    } catch (error) {
      console.error('Failed to export Word:', error)
    }
  }

  // Fullscreen
  const toggleFullScreen = () => {
    isFullScreen.value = !isFullScreen.value

    if (isFullScreen.value) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }

  // Format painter
  const handleCopyFormat = () => {
    const selection = window.getSelection()
    copyFormat(selection)
    formatPainterActive.value = true
  }

  const handlePasteFormat = () => {
    if (!editorContent.value) return
    const selection = window.getSelection()
    const success = pasteFormat(selection)
    if (success) {
      formatPainterActive.value = false
      captureSnapshot()
    }
  }

  return {
    // State
    fontSize,
    spellCheckEnabled,
    isFullScreen,
    formatPainterActive,
    currentTable,
    currentCell,
    tableDesignerPosition,
    tablePropertiesMode,
    initialCellProps,
    initialTableProps,

    // Modal states
    showImageUploadModal,
    showEmbedModal,
    showFileManagerModal,
    showEmojiPicker,
    showTemplateModal,
    showHtmlCodeModal,
    showFindReplaceModal,
    showCodeBlockModal,
    showTableModal,
    showTableDesigner,
    showTablePropertiesModal,

    // Actions
    handleInlineAction,
    handleBlockAction,
    handleListAction,
    handleTextAlignment,
    handleTextColor,
    handleBackgroundColor,
    handleFontSize,
    insertLink,
    insertImage,
    handleInsertImage,
    closeImageUploadModal,
    openEmbedModal,
    handleInsertEmbed,
    closeEmbedModal,
    openFileManagerModal,
    closeFileManagerModal,
    handleInsertFile,
    toggleEmojiPicker,
    handleInsertEmoji,
    openTemplateModal,
    closeTemplateModal,
    handleSelectTemplate,
    openHtmlCodeModal,
    closeHtmlCodeModal,
    handleInsertPageBreak,
    handleInsertTOC,
    handleToggleSpellCheck,
    handleInsertHR,
    openTableModal,
    closeTableModal,
    handleInsertTable,
    handleAddRowAbove,
    handleAddRowBelow,
    handleAddColumnLeft,
    handleAddColumnRight,
    handleRemoveRow,
    handleRemoveColumn,
    handleDeleteTable,
    handleCellProperties,
    handleTableProperties,
    closeTablePropertiesModal,
    handleApplyTableProperties,
    openFindReplaceModal,
    closeFindReplaceModal,
    handleFind,
    handleReplace,
    openCodeBlockModal,
    closeCodeBlockModal,
    handleInsertCodeBlock,
    handleExportHtml,
    handleExportMarkdown,
    handleFormatHtml,
    handleExportPdf,
    handleExportWord,
    toggleFullScreen,
    handleCopyFormat,
    handlePasteFormat,
  }
}
