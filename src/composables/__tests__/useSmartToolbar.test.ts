import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSmartToolbar } from '../useSmartToolbar'

describe('useSmartToolbar', () => {
  let mockEditor: HTMLElement

  beforeEach(() => {
    // Create a mock editor element
    mockEditor = document.createElement('div')
    mockEditor.contentEditable = 'true'
    document.body.appendChild(mockEditor)
  })

  afterEach(() => {
    document.body.removeChild(mockEditor)
  })

  describe('detectContext', () => {
    it('should detect empty context when editor is empty', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = ''
      
      const context = detectContext(mockEditor)
      expect(context).toBe('empty')
    })

    it('should detect empty context when editor only has whitespace', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '   \n\t  '
      
      const context = detectContext(mockEditor)
      expect(context).toBe('empty')
    })

    it('should detect text context for regular paragraphs', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Some text content</p>'
      
      // Set selection in the text
      const range = document.createRange()
      const textNode = mockEditor.querySelector('p')!.firstChild!
      range.setStart(textNode, 0)
      range.setEnd(textNode, 4)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('text')
    })

    it('should detect heading context', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<h1>Heading Text</h1>'
      
      const range = document.createRange()
      const h1 = mockEditor.querySelector('h1')!
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('heading')
    })

    it('should detect heading context for all heading levels', () => {
      const { detectContext } = useSmartToolbar()
      
      for (let level = 1; level <= 6; level++) {
        mockEditor.innerHTML = `<h${level}>Heading ${level}</h${level}>`
        
        const range = document.createRange()
        const heading = mockEditor.querySelector(`h${level}`)!
        range.selectNodeContents(heading)
        const selection = window.getSelection()!
        selection.removeAllRanges()
        selection.addRange(range)
        
        const context = detectContext(mockEditor)
        expect(context).toBe('heading')
      }
    })

    it('should detect list context', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<ul><li>List item</li></ul>'
      
      const range = document.createRange()
      const li = mockEditor.querySelector('li')!
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('list')
    })

    it('should detect list context for ordered lists', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<ol><li>Numbered item</li></ol>'
      
      const range = document.createRange()
      const li = mockEditor.querySelector('li')!
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('list')
    })

    it('should detect link context', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p><a href="https://example.com">Link text</a></p>'
      
      const range = document.createRange()
      const link = mockEditor.querySelector('a')!
      range.selectNodeContents(link)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('link')
    })

    it('should detect image context', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Text with <img src="image.jpg" alt="Test"></p>'
      
      const range = document.createRange()
      const img = mockEditor.querySelector('img')!
      range.selectNode(img)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('image')
    })

    it('should detect table context', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<table><tr><td>Cell</td></tr></table>'
      
      const range = document.createRange()
      const td = mockEditor.querySelector('td')!
      range.selectNodeContents(td)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('table')
    })

    it('should detect code context', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<pre><code>const x = 10;</code></pre>'
      
      const range = document.createRange()
      const code = mockEditor.querySelector('code')!
      range.selectNodeContents(code)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      const context = detectContext(mockEditor)
      expect(context).toBe('code')
    })

    it('should return empty when editor is null', () => {
      const { detectContext } = useSmartToolbar()
      const context = detectContext(null)
      expect(context).toBe('empty')
    })

    it('should return empty when no selection exists', () => {
      const { detectContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Text</p>'
      window.getSelection()!.removeAllRanges()
      
      const context = detectContext(mockEditor)
      expect(context).toBe('empty')
    })
  })

  describe('updateContext', () => {
    it('should update context based on editor state', () => {
      const { context, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<h1>Heading</h1>'
      
      const range = document.createRange()
      const h1 = mockEditor.querySelector('h1')!
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      
      expect(context.value).toBe('empty')
      updateContext(mockEditor)
      expect(context.value).toBe('heading')
    })

    it('should not trigger update if context unchanged', () => {
      const { context, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = ''
      
      expect(context.value).toBe('empty')
      updateContext(mockEditor)
      expect(context.value).toBe('empty')
    })
  })

  describe('config', () => {
    it('should return correct config for empty context', () => {
      const { config, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = ''
      updateContext(mockEditor)
      
      // Empty documents keep the full palette enabled: collapsed-caret
      // formatting (click Bold, then type) must work on first run.
      expect(config.value.format).toBe(true)
      expect(config.value.textFormatting).toBe(true)
      expect(config.value.alignment).toBe(true)
      expect(config.value.insert).toBe(true)
      expect(config.value.export).toBe(true)
    })

    it('should return correct config for text context', () => {
      const { config, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Text</p>'
      
      const range = document.createRange()
      const p = mockEditor.querySelector('p')!
      range.selectNodeContents(p)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      expect(config.value.format).toBe(true)
      expect(config.value.textFormatting).toBe(true)
      expect(config.value.alignment).toBe(true)
      expect(config.value.lists).toBe(true)
      expect(config.value.colors).toBe(true)
      expect(config.value.link).toBe(true)
      expect(config.value.export).toBe(true)
    })

    it('should return correct config for heading context', () => {
      const { config, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<h2>Heading</h2>'

      const range = document.createRange()
      const h2 = mockEditor.querySelector('h2')!
      range.selectNodeContents(h2)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)

      updateContext(mockEditor)

      expect(config.value.textFormatting).toBe(true)
      // Lists must be enabled so a heading can be converted into a list (#18)
      expect(config.value.lists).toBe(true)
      // Insert stays available in every context — inserting a block while the
      // caret is in a heading is a normal action.
      expect(config.value.insert).toBe(true)
    })

    it('should enable alignment inside list context (#8)', () => {
      const { config, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<ul><li>Item</li></ul>'

      const range = document.createRange()
      const li = mockEditor.querySelector('li')!
      range.selectNodeContents(li)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)

      updateContext(mockEditor)

      expect(config.value.lists).toBe(true)
      // applyTextAlignment supports <li>, so alignment must stay enabled (#8)
      expect(config.value.alignment).toBe(true)
    })

    it('should enable list buttons inside heading context (#18)', () => {
      const { config, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<h1>Title</h1>'

      const range = document.createRange()
      const h1 = mockEditor.querySelector('h1')!
      range.selectNodeContents(h1)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)

      updateContext(mockEditor)

      expect(config.value.lists).toBe(true)
    })

    it('should return correct config for code context', () => {
      const { config, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<pre><code>code</code></pre>'
      
      const range = document.createRange()
      const code = mockEditor.querySelector('code')!
      range.selectNodeContents(code)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      expect(config.value.format).toBe(false)
      expect(config.value.textFormatting).toBe(false)
      expect(config.value.colors).toBe(false)
      expect(config.value.link).toBe(false)
      // Block-level inserts escape the <pre> (escapeCodeBlockAtCaret), so the
      // Insert menu stays available even inside code blocks.
      expect(config.value.insert).toBe(true)
    })
  })

  describe('setFloating', () => {
    it('should enable floating mode', () => {
      const { isFloating, setFloating } = useSmartToolbar()
      expect(isFloating.value).toBe(false)
      
      setFloating(true)
      expect(isFloating.value).toBe(true)
    })

    it('should disable floating mode', () => {
      const { isFloating, setFloating } = useSmartToolbar()
      setFloating(true)
      
      setFloating(false)
      expect(isFloating.value).toBe(false)
    })
  })

  describe('setSticky', () => {
    it('should enable sticky mode', () => {
      const { isSticky, setSticky } = useSmartToolbar()
      expect(isSticky.value).toBe(false)
      
      setSticky(true)
      expect(isSticky.value).toBe(true)
    })

    it('should disable sticky mode', () => {
      const { isSticky, setSticky } = useSmartToolbar()
      setSticky(true)
      
      setSticky(false)
      expect(isSticky.value).toBe(false)
    })
  })

  describe('setCustomConfig', () => {
    it('should apply custom configuration', () => {
      const { config, setCustomConfig } = useSmartToolbar()
      
      setCustomConfig({ format: false, colors: false })
      
      expect(config.value.format).toBe(false)
      expect(config.value.colors).toBe(false)
    })

    it('should merge custom config with base config', () => {
      const { config, updateContext, setCustomConfig } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Text</p>'
      
      const range = document.createRange()
      const p = mockEditor.querySelector('p')!
      range.selectNodeContents(p)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      // Text context should have textFormatting true by default
      expect(config.value.textFormatting).toBe(true)
      
      setCustomConfig({ textFormatting: false })
      expect(config.value.textFormatting).toBe(false)
      expect(config.value.alignment).toBe(true) // Other settings preserved
    })
  })

  describe('resetConfig', () => {
    it('should reset to default configuration', () => {
      const { config, setCustomConfig, resetConfig } = useSmartToolbar()
      
      setCustomConfig({ format: false })
      expect(config.value.format).toBe(false)
      
      resetConfig()
      expect(config.value.format).toBe(true) // Back to default empty context
    })
  })

  describe('isVisible', () => {
    it('should return true for visible sections', () => {
      const { isVisible, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Text</p>'
      
      const range = document.createRange()
      const p = mockEditor.querySelector('p')!
      range.selectNodeContents(p)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      expect(isVisible('format')).toBe(true)
      expect(isVisible('textFormatting')).toBe(true)
      expect(isVisible('colors')).toBe(true)
    })

    it('should return false for hidden sections', () => {
      const { isVisible, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<pre><code>code</code></pre>'
      
      const range = document.createRange()
      const code = mockEditor.querySelector('code')!
      range.selectNodeContents(code)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      expect(isVisible('format')).toBe(false)
      expect(isVisible('textFormatting')).toBe(false)
      expect(isVisible('colors')).toBe(false)
    })
  })

  describe('getContextHints', () => {
    it('should return hints for empty context', () => {
      const { getContextHints, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = ''
      updateContext(mockEditor)
      
      const hints = getContextHints()
      expect(hints.length).toBeGreaterThan(0)
      expect(hints[0]).toContain('Start typing')
    })

    it('should return hints for heading context', () => {
      const { getContextHints, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<h1>Heading</h1>'
      
      const range = document.createRange()
      const h1 = mockEditor.querySelector('h1')!
      range.selectNodeContents(h1)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      const hints = getContextHints()
      expect(hints.length).toBeGreaterThan(0)
      expect(hints.some(h => h.includes('Heading'))).toBe(true)
    })

    it('should return hints for list context', () => {
      const { getContextHints, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<ul><li>Item</li></ul>'
      
      const range = document.createRange()
      const li = mockEditor.querySelector('li')!
      range.selectNodeContents(li)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      const hints = getContextHints()
      expect(hints.length).toBeGreaterThan(0)
      expect(hints.some(h => h.includes('Tab'))).toBe(true)
    })

    it('should return hints for code context', () => {
      const { getContextHints, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<pre><code>code</code></pre>'
      
      const range = document.createRange()
      const code = mockEditor.querySelector('code')!
      range.selectNodeContents(code)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      const hints = getContextHints()
      expect(hints.length).toBeGreaterThan(0)
      expect(hints.some(h => h.includes('Code block'))).toBe(true)
    })

    it('should return empty array for text context', () => {
      const { getContextHints, updateContext } = useSmartToolbar()
      mockEditor.innerHTML = '<p>Text</p>'
      
      const range = document.createRange()
      const p = mockEditor.querySelector('p')!
      range.selectNodeContents(p)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      
      updateContext(mockEditor)
      
      const hints = getContextHints()
      expect(hints.length).toBe(0)
    })
  })
})
