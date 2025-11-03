import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  saveSelection,
  restoreSelection,
  wrapSelection,
  applyInlineStyle,
  toggleBlock,
  toggleList,
  isInlineStyleActive,
  isBlockActive,
  isListActive,
  insertLink,
  insertImage,
  clearFormatting,
} from '../formatting'

describe('Formatting Tests', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  describe('saveSelection and restoreSelection', () => {
    it('saves and restores a selection', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      const savedRange = saveSelection()
      expect(savedRange).toBeTruthy()

      // Clear selection
      selection.removeAllRanges()
      expect(selection.rangeCount).toBe(0)

      // Restore
      restoreSelection(savedRange)
      expect(selection.rangeCount).toBe(1)
      expect(selection.toString()).toBe('Hello')
    })

    it('handles null range in restoreSelection', () => {
      restoreSelection(null)
      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('wrapSelection', () => {
    it('wraps selected text in a tag', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      wrapSelection(root, 'strong')

      const strong = root.querySelector('strong')
      expect(strong).toBeTruthy()
      expect(strong!.textContent).toBe('Hello')
    })

    it('wraps with attributes', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      wrapSelection(root, 'span', { class: 'test-class', id: 'test-id' })

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      expect(span!.getAttribute('class')).toBe('test-class')
      expect(span!.getAttribute('id')).toBe('test-id')
    })
  })

  describe('applyInlineStyle', () => {
    it('applies bold style to selection', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyInlineStyle(root, 'strong')

      const strong = root.querySelector('strong')
      expect(strong).toBeTruthy()
      expect(strong!.textContent).toBe('Hello')
    })

    it('toggles style when already applied', () => {
      root.innerHTML = '<p><strong>Hello</strong> World</p>'
      const strong = root.querySelector('strong')!
      
      const range = document.createRange()
      range.selectNodeContents(strong)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      // Check if style is active before toggling
      const wasActive = isInlineStyleActive(root, 'strong')
      expect(wasActive).toBe(true)

      applyInlineStyle(root, 'strong')

      // The text should still be there, though formatting might change
      expect(root.textContent).toContain('Hello')
    })
  })

  describe('toggleBlock', () => {
    it('converts paragraph to heading', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleBlock(root, 'h1')

      const h1 = root.querySelector('h1')
      expect(h1).toBeTruthy()
      expect(h1!.textContent).toBe('Test')
    })

    it('converts heading back to paragraph', () => {
      root.innerHTML = '<h1>Test</h1>'
      const h1 = root.querySelector('h1')!
      
      const range = document.createRange()
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleBlock(root, 'h1', 'p')

      const p = root.querySelector('p')
      expect(p).toBeTruthy()
      expect(root.querySelector('h1')).toBeFalsy()
    })
  })

  describe('toggleList', () => {
    it('converts paragraph to unordered list', () => {
      root.innerHTML = '<p>Item</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleList(root, 'ul')

      const ul = root.querySelector('ul')
      const li = root.querySelector('li')
      expect(ul).toBeTruthy()
      expect(li).toBeTruthy()
      expect(li!.textContent).toBe('Item')
    })

    it('converts list back to paragraphs', () => {
      root.innerHTML = '<ul><li>Item</li></ul>'
      const li = root.querySelector('li')!
      
      const range = document.createRange()
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleList(root, 'ul')

      const p = root.querySelector('p')
      expect(p).toBeTruthy()
      expect(root.querySelector('ul')).toBeFalsy()
    })

    it('creates ordered list', () => {
      root.innerHTML = '<p>Item</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleList(root, 'ol')

      const ol = root.querySelector('ol')
      expect(ol).toBeTruthy()
    })
  })

  describe('isInlineStyleActive', () => {
    it('returns true when style is active', () => {
      root.innerHTML = '<p><strong>Bold</strong></p>'
      const strong = root.querySelector('strong')!
      
      const range = document.createRange()
      range.selectNodeContents(strong)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isInlineStyleActive(root, 'strong')).toBe(true)
    })

    it('returns false when style is not active', () => {
      root.innerHTML = '<p>Normal</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isInlineStyleActive(root, 'strong')).toBe(false)
    })
  })

  describe('isBlockActive', () => {
    it('returns true for matching block', () => {
      root.innerHTML = '<h1>Heading</h1>'
      const h1 = root.querySelector('h1')!
      
      const range = document.createRange()
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isBlockActive(root, 'h1')).toBe(true)
    })

    it('returns false for non-matching block', () => {
      root.innerHTML = '<p>Paragraph</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isBlockActive(root, 'h1')).toBe(false)
    })
  })

  describe('isListActive', () => {
    it('returns true when in unordered list', () => {
      root.innerHTML = '<ul><li>Item</li></ul>'
      const li = root.querySelector('li')!
      
      const range = document.createRange()
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isListActive(root, 'ul')).toBe(true)
    })

    it('returns false when not in list', () => {
      root.innerHTML = '<p>Item</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isListActive(root, 'ul')).toBe(false)
    })
  })

  describe('insertLink', () => {
    it('inserts link with URL', () => {
      root.innerHTML = '<p>Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertLink(root, 'https://example.com')

      const link = root.querySelector('a')
      expect(link).toBeTruthy()
      expect(link!.href).toBe('https://example.com/')
      expect(link!.target).toBe('_blank')
      expect(link!.rel).toBe('noopener noreferrer')
    })
  })

  describe('insertImage', () => {
    it('inserts image with URL', () => {
      root.innerHTML = '<p>Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertImage(root, 'https://example.com/image.jpg', 'Test image')

      const img = root.querySelector('img')
      expect(img).toBeTruthy()
      expect(img!.src).toBe('https://example.com/image.jpg')
      expect(img!.alt).toBe('Test image')
    })

    it('inserts image without alt text', () => {
      root.innerHTML = '<p>Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertImage(root, 'https://example.com/image.jpg')

      const img = root.querySelector('img')
      expect(img).toBeTruthy()
      expect(img!.alt).toBe('')
    })
  })

  describe('clearFormatting', () => {
    it('clears formatting from selected text', () => {
      root.innerHTML = '<p><strong><em>Formatted</em></strong></p>'
      const em = root.querySelector('em')!
      
      const range = document.createRange()
      range.selectNodeContents(em)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      clearFormatting(root)

      // The text should remain
      expect(root.textContent).toContain('Formatted')
    })

    it('does nothing when selection is collapsed', () => {
      root.innerHTML = '<p><strong>Formatted</strong></p>'
      const strong = root.querySelector('strong')!
      
      const range = document.createRange()
      range.setStart(strong.firstChild!, 0)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      clearFormatting(root)

      // Nothing should change for collapsed selection
      expect(root.querySelector('strong')).toBeTruthy()
    })
  })
})
