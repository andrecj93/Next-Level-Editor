import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getCharacterCountWithoutSpaces,
  applyTextAlignment,
  insertHorizontalRule,
  insertTable,
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

      insertHorizontalRule(root)

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

      insertHorizontalRule(root)

      const newSelection = window.getSelection()!
      const newRange = newSelection.getRangeAt(0)
      
      // Selection should be after the HR
      expect(newRange.collapsed).toBe(true)
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
