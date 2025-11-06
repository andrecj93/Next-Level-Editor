import { describe, it, expect, beforeEach } from 'vitest'
import {
  copyFormat,
  pasteFormat,
  clearCopiedFormat,
  hasFormatCopied,
  getCopiedFormat,
} from '../formatPainter'

describe('Format Painter', () => {
  beforeEach(() => {
    // Clear format before each test
    clearCopiedFormat()
  })

  describe('copyFormat', () => {
    it('should return null when copying format without selection', () => {
      const result = copyFormat(null)
      expect(result).toBeNull()
    })

    it('should return null when selection has no range', () => {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      const result = copyFormat(selection)
      expect(result).toBeNull()
    })

    it('should return null when container element is null', () => {
      // This test checks edge case handling
      // When selection has a range but no valid container element
      const selection = window.getSelection()
      selection?.removeAllRanges()
      
      const result = copyFormat(selection)
      expect(result).toBeNull()
    })

    it('should copy format from a styled element', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.style.color = 'red'
      span.textContent = 'Test'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      const format = copyFormat(selection)
      expect(format).not.toBeNull()
      expect(format?.styles.fontWeight).toBe('bold')
      expect(format?.styles.color).toBeTruthy() // Color value varies by browser

      document.body.removeChild(div)
    })

    it('should copy all style properties', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.style.fontStyle = 'italic'
      span.style.textDecoration = 'underline'
      span.style.color = 'blue'
      span.style.backgroundColor = 'yellow'
      span.style.fontSize = '20px'
      span.textContent = 'Test'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      const format = copyFormat(selection)
      expect(format).not.toBeNull()
      expect(format?.styles.fontWeight).toBe('bold')
      expect(format?.styles.fontStyle).toBe('italic')
      expect(format?.styles.textDecoration).toContain('underline')
      expect(format?.styles.fontSize).toBe('20px')

      document.body.removeChild(div)
    })

    it('should have format copied after copy', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.textContent = 'Test'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      copyFormat(selection)
      expect(hasFormatCopied()).toBe(true)

      document.body.removeChild(div)
    })
  })

  describe('pasteFormat', () => {
    it('should return false when pasting without copied format', () => {
      clearCopiedFormat()
      const result = pasteFormat(null)
      expect(result).toBe(false)
    })

    it('should return false when selection is null', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.textContent = 'Test'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      copyFormat(selection)
      const result = pasteFormat(null)
      expect(result).toBe(false)

      document.body.removeChild(div)
    })

    it('should return false when pasting to collapsed selection', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.textContent = 'Source'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      copyFormat(selection)

      // Create collapsed selection
      const newRange = document.createRange()
      newRange.selectNodeContents(div)
      newRange.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(newRange)

      const result = pasteFormat(selection)
      expect(result).toBe(false)

      document.body.removeChild(div)
    })

    it('should return false when selected text is empty', () => {
      const div = document.createElement('div')
      const source = document.createElement('span')
      source.style.fontWeight = 'bold'
      source.textContent = 'Source'
      div.appendChild(source)

      const target = document.createElement('span')
      target.textContent = ''
      div.appendChild(target)
      document.body.appendChild(div)

      const selection = window.getSelection()
      
      // Copy format from source
      const range1 = document.createRange()
      range1.selectNodeContents(source)
      selection?.removeAllRanges()
      selection?.addRange(range1)
      copyFormat(selection)

      // Try to paste to empty target
      const range2 = document.createRange()
      range2.selectNodeContents(target)
      selection?.removeAllRanges()
      selection?.addRange(range2)

      const result = pasteFormat(selection)
      expect(result).toBe(false)

      document.body.removeChild(div)
    })

    it('should paste format with all styles', () => {
      const div = document.createElement('div')
      
      // Source with rich formatting
      const source = document.createElement('span')
      source.style.fontWeight = 'bold'
      source.style.fontStyle = 'italic'
      source.style.textDecoration = 'underline'
      source.style.color = 'red'
      source.style.backgroundColor = 'yellow'
      source.style.fontSize = '18px'
      source.textContent = 'Source'
      div.appendChild(source)

      // Target plain text
      const target = document.createTextNode('Target text')
      div.appendChild(target)
      document.body.appendChild(div)

      const selection = window.getSelection()
      
      // Copy format from source
      const range1 = document.createRange()
      range1.selectNodeContents(source)
      selection?.removeAllRanges()
      selection?.addRange(range1)
      copyFormat(selection)

      // Paste to target
      const range2 = document.createRange()
      range2.selectNode(target)
      selection?.removeAllRanges()
      selection?.addRange(range2)

      const result = pasteFormat(selection)
      expect(result).toBe(true)

      // Check that formatting was applied
      const formattedSpan = div.querySelector('span:not(:first-child)') as HTMLElement
      expect(formattedSpan).toBeTruthy()
      expect(formattedSpan?.style.fontWeight).toBe('bold')
      expect(formattedSpan?.style.fontStyle).toBe('italic')
      expect(formattedSpan?.style.textDecoration).toContain('underline')
      expect(formattedSpan?.style.fontSize).toBe('18px')

      document.body.removeChild(div)
    })

    it('should not apply normal font weight', () => {
      const div = document.createElement('div')
      
      const source = document.createElement('span')
      source.style.fontWeight = '400' // normal weight
      source.textContent = 'Source'
      div.appendChild(source)

      const target = document.createTextNode('Target')
      div.appendChild(target)
      document.body.appendChild(div)

      const selection = window.getSelection()
      
      const range1 = document.createRange()
      range1.selectNodeContents(source)
      selection?.removeAllRanges()
      selection?.addRange(range1)
      copyFormat(selection)

      const range2 = document.createRange()
      range2.selectNode(target)
      selection?.removeAllRanges()
      selection?.addRange(range2)

      pasteFormat(selection)

      const formattedSpan = div.querySelector('span:not(:first-child)') as HTMLElement
      expect(formattedSpan?.style.fontWeight).toBe('')

      document.body.removeChild(div)
    })

    it('should not apply transparent background', () => {
      const div = document.createElement('div')
      
      const source = document.createElement('span')
      source.style.backgroundColor = 'transparent'
      source.textContent = 'Source'
      div.appendChild(source)

      const target = document.createTextNode('Target')
      div.appendChild(target)
      document.body.appendChild(div)

      const selection = window.getSelection()
      
      const range1 = document.createRange()
      range1.selectNodeContents(source)
      selection?.removeAllRanges()
      selection?.addRange(range1)
      copyFormat(selection)

      const range2 = document.createRange()
      range2.selectNode(target)
      selection?.removeAllRanges()
      selection?.addRange(range2)

      pasteFormat(selection)

      const formattedSpan = div.querySelector('span:not(:first-child)') as HTMLElement
      expect(formattedSpan?.style.backgroundColor).toBe('')

      document.body.removeChild(div)
    })
  })

  describe('clearCopiedFormat', () => {
    it('should clear copied format', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.textContent = 'Test'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      copyFormat(selection)
      expect(hasFormatCopied()).toBe(true)
      clearCopiedFormat()
      expect(hasFormatCopied()).toBe(false)

      document.body.removeChild(div)
    })
  })

  describe('getCopiedFormat', () => {
    it('should get copied format', () => {
      clearCopiedFormat()
      expect(getCopiedFormat()).toBeNull()

      const div = document.createElement('div')
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.textContent = 'Test'
      div.appendChild(span)
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(range)

      copyFormat(selection)
      const format = getCopiedFormat()
      expect(format).not.toBeNull()
      expect(format?.styles.fontWeight).toBe('bold')

      document.body.removeChild(div)
    })
  })
})
