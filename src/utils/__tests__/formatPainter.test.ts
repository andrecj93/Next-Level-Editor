import { describe, it, expect } from 'vitest'
import {
  copyFormat,
  pasteFormat,
  clearCopiedFormat,
  hasFormatCopied,
  getCopiedFormat,
} from '../formatPainter'

describe('Format Painter', () => {
  it('should return null when copying format without selection', () => {
    const result = copyFormat(null)
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
    expect(format?.styles.color).toBe('red')

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

  it('should return false when pasting without copied format', () => {
    clearCopiedFormat()
    const result = pasteFormat(null)
    expect(result).toBe(false)
  })

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
})
