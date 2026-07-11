import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getCharacterCountWithoutSpaces,
  applyTextAlignment,
  insertHorizontalRule,
  insertTable,
  insertChecklist,
  searchAndReplace,
} from '../commands'

describe('Additional Commands Coverage', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  describe('getCharacterCountWithoutSpaces', () => {
    it('returns character count without spaces', () => {
      const html = '<p>Hello World</p>'
      const count = getCharacterCountWithoutSpaces(html)
      expect(count).toBe(10) // "HelloWorld" without space
    })

    it('handles empty content', () => {
      const count = getCharacterCountWithoutSpaces('')
      expect(count).toBe(0)
    })

    it('handles content with multiple spaces', () => {
      const html = '<p>Test   with   spaces</p>'
      const count = getCharacterCountWithoutSpaces(html)
      expect(count).toBe(14) // "Testwithspaces"
    })
  })

  describe('applyTextAlignment', () => {
    it('applies left alignment to paragraph', () => {
      root.innerHTML = '<p>Test text</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextAlignment(root, 'left')

      expect(p.style.textAlign).toBe('left')
    })

    it('applies center alignment to heading', () => {
      root.innerHTML = '<h1>Test heading</h1>'
      const h1 = root.querySelector('h1')!

      const range = document.createRange()
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextAlignment(root, 'center')

      expect(h1.style.textAlign).toBe('center')
    })

    it('applies right alignment', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextAlignment(root, 'right')

      expect(p.style.textAlign).toBe('right')
    })

    it('applies justify alignment', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextAlignment(root, 'justify')

      expect(p.style.textAlign).toBe('justify')
    })

    it('handles alignment on list items', () => {
      root.innerHTML = '<ul><li>Item</li></ul>'
      const li = root.querySelector('li')!

      const range = document.createRange()
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextAlignment(root, 'center')

      expect(li.style.textAlign).toBe('center')
    })

    it('applies alignment when selecting all content (Ctrl+A scenario)', () => {
      // This reproduces the bug where selecting all text and applying alignment does nothing
      root.innerHTML = '<p>First paragraph</p><p>Second paragraph</p><h1>Heading</h1>'
      
      // Select all content in the root (simulates Ctrl+A)
      const range = document.createRange()
      range.selectNodeContents(root)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      // Apply center alignment
      applyTextAlignment(root, 'center')

      // Check that at least one block element got the alignment
      const p1 = root.querySelector('p:nth-of-type(1)') as HTMLElement
      const p2 = root.querySelector('p:nth-of-type(2)') as HTMLElement
      const h1 = root.querySelector('h1') as HTMLElement

      // At least one element should have alignment applied
      const hasAlignment = p1.style.textAlign === 'center' || 
                          p2.style.textAlign === 'center' || 
                          h1.style.textAlign === 'center'
      
      expect(hasAlignment).toBe(true)
    })

    it('applies alignment to multiple elements when entire root is selected', () => {
      root.innerHTML = '<p>Paragraph 1</p><h2>Heading</h2><p>Paragraph 2</p>'
      
      // Select all content
      const range = document.createRange()
      range.selectNodeContents(root)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextAlignment(root, 'right')

      // All block elements should have the alignment
      const p1 = root.querySelector('p:nth-of-type(1)') as HTMLElement
      const h2 = root.querySelector('h2') as HTMLElement
      const p2 = root.querySelector('p:nth-of-type(2)') as HTMLElement

      expect(p1.style.textAlign).toBe('right')
      expect(h2.style.textAlign).toBe('right')
      expect(p2.style.textAlign).toBe('right')
    })

    it('handles text node as commonAncestorContainer (bug fix)', () => {
      // This reproduces the bug: "Cannot read properties of undefined (reading 'toLowerCase')"
      // When selecting text within a paragraph, commonAncestorContainer is a text node
      root.innerHTML = '<p>Some text content here</p>'
      const p = root.querySelector('p')!
      const textNode = p.firstChild as Text

      // Create a range that selects part of the text (text node is commonAncestor)
      const range = document.createRange()
      range.setStart(textNode, 5)
      range.setEnd(textNode, 9)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      // This should not throw an error
      expect(() => applyTextAlignment(root, 'center')).not.toThrow()

      // The paragraph should have the alignment
      expect(p.style.textAlign).toBe('center')
    })

    it('handles collapsed selection on text node', () => {
      // Another scenario: cursor is inside text (collapsed range on text node)
      root.innerHTML = '<p>Test text</p>'
      const p = root.querySelector('p')!
      const textNode = p.firstChild as Text

      const range = document.createRange()
      range.setStart(textNode, 4)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      // This should not throw an error
      expect(() => applyTextAlignment(root, 'right')).not.toThrow()

      // The paragraph should have the alignment
      expect(p.style.textAlign).toBe('right')
    })
  })

  describe('insertHorizontalRule', () => {
    it('inserts horizontal rule at cursor position', () => {
      root.innerHTML = '<p>Before</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.setStart(p.firstChild!, 6)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertHorizontalRule()

      const hr = root.querySelector('hr')
      expect(hr).toBeTruthy()
    })

    it('moves cursor after inserted hr', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.setStart(p.firstChild!, 2)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertHorizontalRule()

      const newSelection = window.getSelection()!
      const newRange = newSelection.getRangeAt(0)
      
      // Selection should be after the HR
      expect(newRange.collapsed).toBe(true)
    })
  })

  describe('insertChecklist', () => {
    const placeCaret = (node: Node, offset: number) => {
      const range = document.createRange()
      range.setStart(node, offset)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    }

    it('inserts a sanitizer-safe unchecked checklist item at block level', () => {
      root.innerHTML = '<p>Line</p>'
      placeCaret(root.querySelector('p')!.firstChild!, 4)

      insertChecklist(root)

      const li = root.querySelector('ul.checklist > li')
      expect(li).not.toBeNull()
      expect(li!.getAttribute('data-checked')).toBe('false')
      // Never nested inside a <p> (invalid HTML that corrupts on round-trip).
      expect(root.querySelector('p ul')).toBeNull()
    })

    it('wraps selected text into the checklist item', () => {
      root.innerHTML = '<p>buy milk</p>'
      const text = root.querySelector('p')!.firstChild!
      const range = document.createRange()
      range.setStart(text, 0)
      range.setEnd(text, 8)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)

      insertChecklist(root)

      const li = root.querySelector('ul.checklist > li')
      expect(li).not.toBeNull()
      expect(li!.textContent).toBe('buy milk')
    })

    it('does nothing without a selection', () => {
      root.innerHTML = '<p>x</p>'
      window.getSelection()!.removeAllRanges()
      insertChecklist(root)
      expect(root.querySelector('ul.checklist')).toBeNull()
    })
  })

  describe('insertTable', () => {
    it('inserts table with specified rows and columns', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertTable(root, 3, 2, false)

      const table = root.querySelector('table')
      expect(table).toBeTruthy()
      
      const rows = table!.querySelectorAll('tr')
      expect(rows.length).toBe(3)
      
      const cells = rows[0].querySelectorAll('td')
      expect(cells.length).toBe(2)
    })

    it('inserts table with header row', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertTable(root, 3, 2, true)

      const table = root.querySelector('table')
      expect(table).toBeTruthy()
      
      const thead = table!.querySelector('thead')
      expect(thead).toBeTruthy()
      
      const headerCells = thead!.querySelectorAll('th')
      expect(headerCells.length).toBe(2)
      
      const tbody = table!.querySelector('tbody')
      expect(tbody).toBeTruthy()
      
      const bodyRows = tbody!.querySelectorAll('tr')
      expect(bodyRows.length).toBe(2) // 3 total - 1 header = 2
    })

    it('inserts table with correct styling', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!

      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertTable(root, 2, 2, true)

      const table = root.querySelector('table')
      expect(table!.style.width).toBe('100%')
      expect(table!.style.borderCollapse).toBe('collapse')
    })

    it('splits the caret paragraph so the table is never nested in a <p>', () => {
      root.innerHTML = '<p>HelloWorld</p>'
      const textNode = root.querySelector('p')!.firstChild!
      const range = document.createRange()
      range.setStart(textNode, 5) // caret between "Hello" and "World"
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertTable(root, 2, 2, false)

      // A <table> inside a <p> is invalid HTML that the parser foster-parents
      // out on the next round-trip, reordering the paragraph.
      expect(root.querySelector('p table')).toBeNull()
      // The paragraph is split around the table, in document order.
      const tags = [...root.children].map((el) => el.tagName)
      expect(tags).toEqual(['P', 'TABLE', 'P'])
      expect(root.children[0].textContent).toBe('Hello')
      expect(root.children[2].textContent).toBe('World')
    })

    it('clamps a huge row count instead of building thousands of cells', () => {
      root.innerHTML = '<p>x</p>'
      const range = document.createRange()
      range.selectNodeContents(root.querySelector('p')!)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertTable(root, 9999, 3, false)

      const rows = root.querySelectorAll('tr')
      expect(rows.length).toBe(50) // clamped to the 1–50 bound
    })
  })

  describe('searchAndReplace', () => {
    it('replaces text with case sensitivity', () => {
      const html = '<p>Hello World. hello there.</p>'
      const result = searchAndReplace(html, 'hello', 'Hi', { caseSensitive: true, wholeWord: false })
      
      expect(result).toContain('Hi')
      expect(result).toContain('Hello') // Should not replace "Hello"
    })

    it('replaces all occurrences without case sensitivity', () => {
      const html = '<p>Hello World. hello there.</p>'
      const result = searchAndReplace(html, 'hello', 'Hi', { caseSensitive: false, wholeWord: false })
      
      // Should replace both "Hello" and "hello"
      expect(result).toContain('Hi')
      expect(result.match(/Hi/g)?.length).toBe(2)
    })

    it('replaces whole words only', () => {
      const html = '<p>Hello there, say hello.</p>'
      const result = searchAndReplace(html, 'hello', 'Hi', { caseSensitive: false, wholeWord: true })
      
      expect(result).toContain('Hi')
    })

    it('handles empty search text', () => {
      const html = '<p>Test</p>'
      const result = searchAndReplace(html, '', 'replacement', { caseSensitive: false, wholeWord: false })
      
      expect(result).toBe(html) // Should not change
    })
  })
})
