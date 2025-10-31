/**
 * Command definitions for slash commands and toolbar actions
 */

export interface EditorCommand {
  id: string
  label: string
  description: string
  keywords: string[]
  icon?: string
  execute: () => void
}

/**
 * Get word count from HTML content
 * @param html - HTML content
 * @returns Word count
 */
export function getWordCount(html: string): number {
  const temp = document.createElement('div')
  temp.innerHTML = html
  const text = temp.textContent || ''
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

/**
 * Get character count from HTML content (excluding whitespace)
 * @param html - HTML content
 * @returns Character count
 */
export function getCharacterCount(html: string): number {
  const temp = document.createElement('div')
  temp.innerHTML = html
  const text = temp.textContent || ''
  return text.length
}

/**
 * Get character count including spaces
 * @param html - HTML content
 * @returns Character count with spaces
 */
export function getCharacterCountWithSpaces(html: string): number {
  const temp = document.createElement('div')
  temp.innerHTML = html
  const text = temp.textContent || ''
  return text.length
}

/**
 * Apply text alignment to selected block
 * @param root - Editor root element
 * @param alignment - Text alignment (left, center, right, justify)
 */
export function applyTextAlignment(root: HTMLElement, alignment: 'left' | 'center' | 'right' | 'justify') {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  let element = range.commonAncestorContainer as HTMLElement

  // Find the closest block element
  while (element && element !== root) {
    if (element.nodeType === Node.ELEMENT_NODE) {
      const tagName = element.tagName.toLowerCase()
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'blockquote'].includes(tagName)) {
        element.style.textAlign = alignment
        return
      }
    }
    element = element.parentElement as HTMLElement
  }
}

/**
 * Apply text color to selection
 * @param root - Editor root element
 * @param color - Color value (hex, rgb, etc.)
 */
export function applyTextColor(root: HTMLElement, color: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  
  if (range.collapsed) {
    // Insert a span with color at caret position
    const span = document.createElement('span')
    span.style.color = color
    span.textContent = '\u200B' // Zero-width space
    range.insertNode(span)
    range.selectNodeContents(span)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    // Wrap selection in span with color
    const span = document.createElement('span')
    span.style.color = color
    const contents = range.extractContents()
    span.appendChild(contents)
    range.insertNode(span)
  }
}

/**
 * Apply background color to selection
 * @param root - Editor root element
 * @param color - Color value (hex, rgb, etc.)
 */
export function applyBackgroundColor(root: HTMLElement, color: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  
  if (range.collapsed) {
    const span = document.createElement('span')
    span.style.backgroundColor = color
    span.textContent = '\u200B'
    range.insertNode(span)
    range.selectNodeContents(span)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    const span = document.createElement('span')
    span.style.backgroundColor = color
    const contents = range.extractContents()
    span.appendChild(contents)
    range.insertNode(span)
  }
}

/**
 * Insert horizontal rule
 * @param root - Editor root element
 */
export function insertHorizontalRule(root: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const hr = document.createElement('hr')
  range.deleteContents()
  range.insertNode(hr)
  
  // Move cursor after HR
  const newRange = document.createRange()
  newRange.setStartAfter(hr)
  newRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(newRange)
}

/**
 * Search and replace text in content
 * @param html - HTML content
 * @param searchText - Text to search for
 * @param replaceText - Text to replace with
 * @param options - Search options
 * @returns Modified HTML
 */
export function searchAndReplace(
  html: string,
  searchText: string,
  replaceText: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): string {
  if (!searchText) return html

  let flags = 'g'
  if (!options.caseSensitive) flags += 'i'

  let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`
  }

  const regex = new RegExp(pattern, flags)
  
  const temp = document.createElement('div')
  temp.innerHTML = html

  const replaceInTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        node.textContent = node.textContent.replace(regex, replaceText)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(replaceInTextNodes)
    }
  }

  replaceInTextNodes(temp)
  return temp.innerHTML
}
