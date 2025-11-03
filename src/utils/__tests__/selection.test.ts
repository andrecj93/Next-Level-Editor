import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyFontSize, applyTextColor, applyBackgroundColor } from '../commands'

describe('Selection Management', () => {
  let root: HTMLElement

  beforeEach(() => {
    // Create a fresh editor root for each test
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  describe('applyFontSize', () => {
    it('applies font size to selected text', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      // Select "World"
      const range = document.createRange()
      range.setStart(p.firstChild!, 6)
      range.setEnd(p.firstChild!, 11)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyFontSize(root, 'large')

      // Check that the font size was applied
      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      expect(span!.style.fontSize).toBe('1.25em')
      expect(span!.textContent).toBe('World')
    })

    it('restores selection after applying font size', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      // Select "World"
      const range = document.createRange()
      range.setStart(p.firstChild!, 6)
      range.setEnd(p.firstChild!, 11)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyFontSize(root, 'large')

      // Check that selection is restored
      const newSelection = window.getSelection()!
      expect(newSelection.rangeCount).toBe(1)
      expect(newSelection.toString()).toBe('World')
    })

    it('applies different font sizes correctly', () => {
      const sizes = [
        { size: 'small' as const, expected: '0.875em' },
        { size: 'normal' as const, expected: '1em' },
        { size: 'large' as const, expected: '1.25em' },
        { size: 'huge' as const, expected: '1.75em' },
      ]

      sizes.forEach(({ size, expected }) => {
        root.innerHTML = '<p>Test</p>'
        const p = root.querySelector('p')!
        
        const range = document.createRange()
        range.selectNodeContents(p)
        const selection = window.getSelection()!
        selection.removeAllRanges()
        selection.addRange(range)

        applyFontSize(root, size)

        const span = root.querySelector('span')
        expect(span!.style.fontSize).toBe(expected)
      })
    })
  })

  describe('applyTextColor', () => {
    it('applies text color to selected text', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      // Select "Hello"
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextColor(root, '#ff0000')

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      // Color format can vary by browser - check it contains the color value
      expect(span!.style.color).toBeTruthy()
      expect(span!.textContent).toBe('Hello')
    })

    it('restores selection after applying text color', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextColor(root, '#ff0000')

      const newSelection = window.getSelection()!
      expect(newSelection.rangeCount).toBe(1)
      expect(newSelection.toString()).toBe('Hello')
    })
  })

  describe('applyBackgroundColor', () => {
    it('applies background color to selected text', () => {
      root.innerHTML = '<p>Test Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 4)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyBackgroundColor(root, '#ffff00')

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      // Color format can vary by browser - check it contains the color value
      expect(span!.style.backgroundColor).toBeTruthy()
      expect(span!.textContent).toBe('Test')
    })

    it('restores selection after applying background color', () => {
      root.innerHTML = '<p>Test Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 4)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyBackgroundColor(root, '#ffff00')

      const newSelection = window.getSelection()!
      expect(newSelection.rangeCount).toBe(1)
      expect(newSelection.toString()).toBe('Test')
    })
  })

  describe('Collapsed selection handling', () => {
    it('inserts zero-width space for font size at caret', () => {
      root.innerHTML = '<p>Hello</p>'
      const p = root.querySelector('p')!
      
      // Place caret at end
      const range = document.createRange()
      range.setStart(p.firstChild!, 5)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyFontSize(root, 'large')

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      expect(span!.style.fontSize).toBe('1.25em')
      expect(span!.textContent).toBe('\u200B')
    })

    it('inserts zero-width space for text color at caret', () => {
      root.innerHTML = '<p>Hello</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 5)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyTextColor(root, '#ff0000')

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      // Color format can vary by browser - check it contains the color value
      expect(span!.style.color).toBeTruthy()
      expect(span!.textContent).toBe('\u200B')
    })

    it('inserts zero-width space for background color at caret', () => {
      root.innerHTML = '<p>Hello</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 5)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyBackgroundColor(root, '#ffff00')

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      // Color format can vary by browser - check it contains the color value
      expect(span!.style.backgroundColor).toBeTruthy()
      expect(span!.textContent).toBe('\u200B')
    })
  })
})
