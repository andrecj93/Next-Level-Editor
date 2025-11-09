import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useContextMenu } from '../useContextMenu'

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
  readText: vi.fn()
}

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
  configurable: true
})

// Mock commands utils
vi.mock('../../utils/commands', () => ({
  getSelectedTable: vi.fn(() => null),
  getSelectedCell: vi.fn(() => null)
}))

describe('useContextMenu', () => {
  let editorElement: HTMLDivElement
  let editorContent: Ref<HTMLElement | null>
  let handleInlineAction: (tag: string) => void
  let insertLink: () => void
  let insertImage: () => void
  let rememberSelection: () => void
  let showTableDesigner: Ref<boolean>
  let currentTable: Ref<HTMLTableElement | null>
  let currentCell: Ref<HTMLTableCellElement | null>
  let tableDesignerPosition: Ref<{ x: number; y: number }>

  beforeEach(() => {
    // Setup editor element
    editorElement = document.createElement('div')
    editorElement.setAttribute('contenteditable', 'true')
    editorElement.innerHTML = '<p>Test content for context menu</p>'
    document.body.appendChild(editorElement)

    // Setup refs and mocks
    editorContent = ref<HTMLElement | null>(editorElement)
    handleInlineAction = vi.fn(() => {})
    insertLink = vi.fn(() => {})
    insertImage = vi.fn(() => {})
    rememberSelection = vi.fn(() => {})
    showTableDesigner = ref<boolean>(false)
    currentTable = ref<HTMLTableElement | null>(null)
    currentCell = ref<HTMLTableCellElement | null>(null)
    tableDesignerPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 })

    // Clear mocks
    mockClipboard.writeText.mockClear()
    mockClipboard.readText.mockClear()
  })

  afterEach(() => {
    editorElement.remove()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with context menu hidden', () => {
      const { showContextMenu } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      expect(showContextMenu.value).toBe(false)
    })

    it('should initialize with default position', () => {
      const { contextMenuPosition } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      expect(contextMenuPosition.value).toEqual({ top: 0, left: 0 })
    })
  })

  describe('Context Menu Items', () => {
    it('should provide context menu items', () => {
      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      expect(contextMenuItems.value).toBeInstanceOf(Array)
      expect(contextMenuItems.value.length).toBeGreaterThan(0)
    })

    it('should include cut, copy, paste items', () => {
      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const itemIds = contextMenuItems.value.filter(item => !item.divider).map(item => item.id)
      expect(itemIds).toContain('cut')
      expect(itemIds).toContain('copy')
      expect(itemIds).toContain('paste')
    })

    it('should include formatting items', () => {
      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const itemIds = contextMenuItems.value.filter(item => !item.divider).map(item => item.id)
      expect(itemIds).toContain('bold')
      expect(itemIds).toContain('italic')
      expect(itemIds).toContain('underline')
    })

    it('should include insert items', () => {
      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const itemIds = contextMenuItems.value.filter(item => !item.divider).map(item => item.id)
      expect(itemIds).toContain('link')
      expect(itemIds).toContain('image')
    })

    it('should disable items when no text is selected', () => {
      // Clear selection
      const selection = globalThis.getSelection()
      if (selection) {
        selection.removeAllRanges()
      }

      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const cutItem = contextMenuItems.value.find(item => item.id === 'cut')
      const copyItem = contextMenuItems.value.find(item => item.id === 'copy')
      const boldItem = contextMenuItems.value.find(item => item.id === 'bold')

      expect(cutItem?.disabled).toBe(true)
      expect(copyItem?.disabled).toBe(true)
      expect(boldItem?.disabled).toBe(true)
    })

    it('should enable items when text is selected', () => {
      // Create selection
      const range = document.createRange()
      const textNode = editorElement.querySelector('p')?.firstChild
      if (textNode) {
        range.setStart(textNode, 0)
        range.setEnd(textNode, 4)
        const selection = globalThis.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const cutItem = contextMenuItems.value.find(item => item.id === 'cut')
      const copyItem = contextMenuItems.value.find(item => item.id === 'copy')

      expect(cutItem?.disabled).toBe(false)
      expect(copyItem?.disabled).toBe(false)
    })
  })

  describe('handleContextMenu', () => {
    it('should show context menu on right click', () => {
      const { handleContextMenu, showContextMenu } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const event = new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 200,
        bubbles: true
      })

      handleContextMenu(event)

      expect(showContextMenu.value).toBe(true)
    })

    it('should prevent default context menu', () => {
      const { handleContextMenu } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const event = new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 200,
        bubbles: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handleContextMenu(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should set context menu position', () => {
      const { handleContextMenu, contextMenuPosition } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const event = new MouseEvent('contextmenu', {
        clientX: 150,
        clientY: 250,
        bubbles: true
      })

      handleContextMenu(event)

      expect(contextMenuPosition.value).toEqual({ top: 250, left: 150 })
    })

    it('should remember selection before showing menu', () => {
      const { handleContextMenu } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const event = new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 200,
        bubbles: true
      })

      handleContextMenu(event)

      expect(rememberSelection).toHaveBeenCalled()
    })

    it('should show table designer when clicking on table', async () => {
      const { getSelectedTable, getSelectedCell } = await import('../../utils/commands')
      const mockTable = document.createElement('table')
      const mockCell = document.createElement('td')
      
      vi.mocked(getSelectedTable).mockReturnValue(mockTable)
      vi.mocked(getSelectedCell).mockReturnValue(mockCell)

      // Add table to editor
      const table = document.createElement('table')
      const td = document.createElement('td')
      td.textContent = 'Cell'
      table.appendChild(td)
      editorElement.appendChild(table)

      const { handleContextMenu } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const event = new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 200,
        bubbles: true
      })
      Object.defineProperty(event, 'target', { value: td, enumerable: true })

      handleContextMenu(event)

      expect(showTableDesigner.value).toBe(true)
      expect(currentTable.value).toBe(mockTable)
      expect(currentCell.value).toBe(mockCell)
    })
  })

  describe('closeContextMenu', () => {
    it('should hide context menu', () => {
      const { handleContextMenu, closeContextMenu, showContextMenu } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      // Show menu first
      const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 200 })
      handleContextMenu(event)
      expect(showContextMenu.value).toBe(true)

      // Close menu
      closeContextMenu()
      expect(showContextMenu.value).toBe(false)
    })
  })

  describe('Menu Item Actions', () => {
    it('should call handleInlineAction for bold', () => {
      // Create selection
      const range = document.createRange()
      const textNode = editorElement.querySelector('p')?.firstChild
      if (textNode) {
        range.setStart(textNode, 0)
        range.setEnd(textNode, 4)
        const selection = globalThis.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const boldItem = contextMenuItems.value.find(item => item.id === 'bold')
      boldItem?.onClick?.()

      expect(handleInlineAction).toHaveBeenCalledWith('strong')
    })

    it('should call handleInlineAction for italic', () => {
      const range = document.createRange()
      const textNode = editorElement.querySelector('p')?.firstChild
      if (textNode) {
        range.setStart(textNode, 0)
        range.setEnd(textNode, 4)
        const selection = globalThis.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const italicItem = contextMenuItems.value.find(item => item.id === 'italic')
      italicItem?.onClick?.()

      expect(handleInlineAction).toHaveBeenCalledWith('em')
    })

    it('should call insertLink for link item', () => {
      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const linkItem = contextMenuItems.value.find(item => item.id === 'link')
      linkItem?.onClick?.()

      expect(insertLink).toHaveBeenCalled()
    })

    it('should call insertImage for image item', () => {
      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const imageItem = contextMenuItems.value.find(item => item.id === 'image')
      imageItem?.onClick?.()

      expect(insertImage).toHaveBeenCalled()
    })

    it('should copy text to clipboard', async () => {
      // Create selection
      const range = document.createRange()
      const textNode = editorElement.querySelector('p')?.firstChild
      if (textNode) {
        range.setStart(textNode, 0)
        range.setEnd(textNode, 4)
        const selection = globalThis.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      mockClipboard.writeText.mockResolvedValue(undefined)

      const { contextMenuItems } = useContextMenu({
        editorContent,
        handleInlineAction,
        insertLink,
        insertImage,
        rememberSelection,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition
      })

      const copyItem = contextMenuItems.value.find(item => item.id === 'copy')
      await copyItem?.onClick?.()

      expect(mockClipboard.writeText).toHaveBeenCalled()
    })
  })
})
