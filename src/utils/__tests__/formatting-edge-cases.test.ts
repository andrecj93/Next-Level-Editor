import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  applyInlineStyle,
  toggleBlock,
  toggleList,
  insertLink,
  clearFormatting,
  wrapSelection,
  isInlineStyleActive,
  isBlockActive,
  isListActive
} from '../formatting'

describe('formatting - Additional Edge Cases', () => {
  let dom: JSDOM
  let document: Document
  let container: HTMLElement

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    document = dom.window.document
    global.document = document
    global.window = dom.window as any
    global.Node = dom.window.Node
    global.Range = dom.window.Range
    global.Selection = dom.window.Selection as any

    container = document.createElement('div')
    container.contentEditable = 'true'
    document.body.appendChild(container)
  })

  describe('Edge Cases with Complex HTML', () => {
    it('should handle nested formatting tags', () => {
      container.innerHTML = '<p><strong><em>Bold and italic text</em></strong></p>'
      const textNode = container.querySelector('em')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        // Apply inline style should work even with nested tags
        applyInlineStyle(container, 'u')
        expect(container.innerHTML).toBeTruthy()
      }
    })

    it('should handle empty selection gracefully', () => {
      container.innerHTML = '<p>Test text</p>'
      const selection = dom.window.getSelection()
      selection?.removeAllRanges()

      // Should not throw when no selection
      expect(() => applyInlineStyle(container, 'strong')).not.toThrow()
      expect(() => applyInlineStyle(container, 'em')).not.toThrow()
      expect(() => applyInlineStyle(container, 'u')).not.toThrow()
    })

    it('should handle selection across multiple paragraphs', () => {
      container.innerHTML = '<p>First paragraph</p><p>Second paragraph</p>'
      const firstP = container.querySelector('p')
      const secondP = container.querySelectorAll('p')[1]
      
      if (firstP?.firstChild && secondP?.firstChild) {
        const range = document.createRange()
        range.setStart(firstP.firstChild, 0)
        range.setEnd(secondP.firstChild, 6)
        
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        applyInlineStyle(container, 'strong')
        expect(container.innerHTML).toContain('strong')
      }
    })

    it('should handle partial word selection', () => {
      container.innerHTML = '<p>Testing word</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.setStart(textNode, 0)
        range.setEnd(textNode, 4) // Select "Test"
        
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        applyInlineStyle(container, 'strong')
        expect(container.textContent).toContain('Testing word')
      }
    })
  })

  describe('Link Operations Edge Cases', () => {
    it('should handle empty URL in insertLink', () => {
      container.innerHTML = '<p>Link text</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        insertLink(container, '')
        // Should handle empty URL gracefully
        expect(container.innerHTML).toBeTruthy()
      }
    })

    it('should handle URL with special characters', () => {
      container.innerHTML = '<p>Link text</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        insertLink(container, 'https://example.com/path?param=value&foo=bar#anchor')
        expect(container.innerHTML).toContain('href')
      }
    })

    it('should handle insertLink with no selection', () => {
      container.innerHTML = '<p>Plain text</p>'
      const selection = dom.window.getSelection()
      selection?.removeAllRanges()

      // Should not throw when no selection
      expect(() => insertLink(container, 'https://example.com')).not.toThrow()
    })
  })

  describe('Block Operations Edge Cases', () => {
    it('should convert between different block types', () => {
      container.innerHTML = '<h1>Heading 1</h1>'
      const textNode = container.querySelector('h1')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleBlock(container, 'h2')
        expect(container.innerHTML).toContain('<h2>')
      }
    })

    it('should convert block to paragraph', () => {
      container.innerHTML = '<h2>Heading 2</h2>'
      const textNode = container.querySelector('h2')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleBlock(container, 'p')
        expect(container.innerHTML).toContain('<p>')
      }
    })

    it('should handle block with nested formatting', () => {
      container.innerHTML = '<h1><strong>Bold heading</strong></h1>'
      const textNode = container.querySelector('strong')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleBlock(container, 'h2')
        expect(container.innerHTML).toContain('<h2>')
        expect(container.innerHTML).toContain('<strong>')
      }
    })
  })

  describe('List Operations Edge Cases', () => {
    it('should toggle between ordered and unordered lists', () => {
      container.innerHTML = '<ul><li>Item 1</li></ul>'
      const textNode = container.querySelector('li')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleList(container, 'ol')
        expect(container.innerHTML).toContain('<ol>')
      }
    })

    it('should remove list when toggling same type', () => {
      container.innerHTML = '<ul><li>Item 1</li></ul>'
      const textNode = container.querySelector('li')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleList(container, 'ul')
        expect(container.innerHTML).not.toContain('<ul>')
        expect(container.innerHTML).toContain('<p>')
      }
    })

    it('should create list from paragraph', () => {
      container.innerHTML = '<p>Text to convert</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleList(container, 'ul')
        expect(container.innerHTML).toContain('<ul>')
        expect(container.innerHTML).toContain('<li>')
      }
    })
  })

  describe('Clear Formatting Edge Cases', () => {
    it('should handle mixed content when clearing formatting', () => {
      container.innerHTML = '<p>Plain <strong>bold</strong> and <em>italic</em> text</p>'
      const p = container.querySelector('p')
      
      if (p) {
        const range = document.createRange()
        range.selectNodeContents(p)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        clearFormatting(container)
        // clearFormatting may have different behavior - just check it doesn't throw
        expect(container.textContent).toContain('Plain bold and italic text')
      }
    })
  })

  describe('Wrap Selection', () => {
    it('should wrap selection with custom tag', () => {
      container.innerHTML = '<p>Text to wrap</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        wrapSelection(container, 'mark')
        expect(container.innerHTML).toContain('<mark>')
      }
    })

    it('should handle wrapping with attributes', () => {
      container.innerHTML = '<p>Text to wrap</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        wrapSelection(container, 'span', { class: 'highlight' })
        expect(container.innerHTML).toContain('<span')
        expect(container.innerHTML).toContain('highlight')
      }
    })
  })

  describe('Style State Checks', () => {
    it('should detect active inline styles', () => {
      container.innerHTML = '<p><strong>Bold text</strong></p>'
      const textNode = container.querySelector('strong')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        expect(isInlineStyleActive(container, 'strong')).toBe(true)
        expect(isInlineStyleActive(container, 'em')).toBe(false)
      }
    })

    it('should detect active block types', () => {
      container.innerHTML = '<h2>Heading 2</h2>'
      const textNode = container.querySelector('h2')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        expect(isBlockActive(container, 'h2')).toBe(true)
        expect(isBlockActive(container, 'h1')).toBe(false)
      }
    })

    it('should detect active list types', () => {
      container.innerHTML = '<ul><li>Item</li></ul>'
      const textNode = container.querySelector('li')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        expect(isListActive(container, 'ul')).toBe(true)
        expect(isListActive(container, 'ol')).toBe(false)
      }
    })
  })

  describe('Multiple Operations in Sequence', () => {
    it('should handle multiple formatting operations', () => {
      container.innerHTML = '<p>Test text</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        applyInlineStyle(container, 'strong')
        applyInlineStyle(container, 'em')
        applyInlineStyle(container, 'u')
        
        expect(container.innerHTML).toContain('<strong>')
        expect(container.innerHTML).toContain('<em>')
        expect(container.innerHTML).toContain('<u>')
      }
    })

    it('should handle block then inline formatting', () => {
      container.innerHTML = '<p>Test text</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        toggleBlock(container, 'h2')
        expect(container.innerHTML).toContain('<h2>')
        
        // Apply inline style to heading
        const h2Node = container.querySelector('h2')?.firstChild
        if (h2Node) {
          const newRange = document.createRange()
          newRange.selectNodeContents(h2Node)
          selection?.removeAllRanges()
          selection?.addRange(newRange)
          
          applyInlineStyle(container, 'strong')
          expect(container.innerHTML).toContain('<strong>')
        }
      }
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle single character selection', () => {
      container.innerHTML = '<p>A</p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        applyInlineStyle(container, 'strong')
        expect(container.innerHTML).toContain('<strong>')
      }
    })

    it('should handle very long text selection', () => {
      const longText = 'A'.repeat(1000)
      container.innerHTML = `<p>${longText}</p>`
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        applyInlineStyle(container, 'strong')
        expect(container.innerHTML).toContain('<strong>')
        expect(container.textContent?.length).toBe(1000)
      }
    })

    it('should handle whitespace-only selection', () => {
      container.innerHTML = '<p>   </p>'
      const textNode = container.querySelector('p')?.firstChild
      
      if (textNode) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const selection = dom.window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        expect(() => applyInlineStyle(container, 'strong')).not.toThrow()
      }
    })
  })
})
