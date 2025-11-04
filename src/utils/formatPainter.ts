/**
 * Format Painter Utility
 * Allows copying formatting from one text selection and applying it to another
 */

// Constants
const NORMAL_FONT_WEIGHT = '400'
const NORMAL_FONT_STYLE = 'normal'
const NO_TEXT_DECORATION = 'none'
const TRANSPARENT_BG = 'rgba(0, 0, 0, 0)'

export interface CopiedFormat {
  styles: {
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    color?: string
    backgroundColor?: string
    fontSize?: string
  }
  tagName?: string
  className?: string
}

let copiedFormat: CopiedFormat | null = null

/**
 * Copies the formatting from the current selection
 * @param selection - The browser selection object
 * @returns The copied format or null if no selection
 */
export function copyFormat(selection: Selection | null): CopiedFormat | null {
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  const element =
    container.nodeType === Node.ELEMENT_NODE
      ? (container as HTMLElement)
      : (container.parentElement as HTMLElement)

  if (!element) {
    return null
  }

  const computedStyle = window.getComputedStyle(element)
  const format: CopiedFormat = {
    styles: {
      fontWeight: computedStyle.fontWeight,
      fontStyle: computedStyle.fontStyle,
      textDecoration: computedStyle.textDecoration,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      fontSize: computedStyle.fontSize,
    },
    tagName: element.tagName,
    className: element.className,
  }

  copiedFormat = format
  return format
}

/**
 * Applies the copied format to the current selection
 * @param editor - The editor element
 * @param selection - The browser selection object
 * @returns true if format was applied successfully
 */
export function pasteFormat(
  editor: HTMLElement,
  selection: Selection | null
): boolean {
  if (!copiedFormat || !selection || selection.rangeCount === 0) {
    return false
  }

  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    return false
  }

  // Extract the selected content
  const selectedText = range.toString()
  if (!selectedText) {
    return false
  }

  // Create a new element with the copied format
  const span = document.createElement('span')

  // Apply inline styles
  if (copiedFormat.styles.fontWeight && copiedFormat.styles.fontWeight !== NORMAL_FONT_WEIGHT) {
    span.style.fontWeight = copiedFormat.styles.fontWeight
  }
  if (copiedFormat.styles.fontStyle && copiedFormat.styles.fontStyle !== NORMAL_FONT_STYLE) {
    span.style.fontStyle = copiedFormat.styles.fontStyle
  }
  if (
    copiedFormat.styles.textDecoration &&
    copiedFormat.styles.textDecoration !== NO_TEXT_DECORATION
  ) {
    span.style.textDecoration = copiedFormat.styles.textDecoration
  }
  if (copiedFormat.styles.color) {
    span.style.color = copiedFormat.styles.color
  }
  if (
    copiedFormat.styles.backgroundColor &&
    copiedFormat.styles.backgroundColor !== TRANSPARENT_BG &&
    copiedFormat.styles.backgroundColor !== 'transparent'
  ) {
    span.style.backgroundColor = copiedFormat.styles.backgroundColor
  }
  if (copiedFormat.styles.fontSize) {
    span.style.fontSize = copiedFormat.styles.fontSize
  }

  // Insert the formatted text
  span.textContent = selectedText
  range.deleteContents()
  range.insertNode(span)

  // Restore selection
  const newRange = document.createRange()
  newRange.selectNodeContents(span)
  selection.removeAllRanges()
  selection.addRange(newRange)

  return true
}

/**
 * Clears the copied format
 */
export function clearCopiedFormat(): void {
  copiedFormat = null
}

/**
 * Checks if there is a format copied
 * @returns true if a format is copied
 */
export function hasFormatCopied(): boolean {
  return copiedFormat !== null
}

/**
 * Gets the current copied format
 * @returns The copied format or null
 */
export function getCopiedFormat(): CopiedFormat | null {
  return copiedFormat
}
