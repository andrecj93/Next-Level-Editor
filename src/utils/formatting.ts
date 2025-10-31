export interface SelectionSnapshot {
  range: Range | null
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'])

const isElement = (node: Node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE

const getSelection = () => (typeof window !== 'undefined' ? window.getSelection() : null)

export const getSelectionRange = (): Range | null => {
  const selection = getSelection()
  if (!selection || selection.rangeCount === 0) {
    return null
  }
  return selection.getRangeAt(0)
}

export const saveSelection = (): Range | null => {
  const range = getSelectionRange()
  return range ? range.cloneRange() : null
}

export const restoreSelection = (range: Range | null) => {
  if (!range) return
  const selection = getSelection()
  if (!selection) return
  selection.removeAllRanges()
  selection.addRange(range)
}

const ensureRangeWithinRoot = (range: Range, root: HTMLElement) => {
  const commonAncestor = range.commonAncestorContainer
  if (!root.contains(commonAncestor)) {
    throw new Error('Selection is outside the editor root.')
  }
}

const getClosestElement = (
  node: Node | null,
  predicate: (element: HTMLElement) => boolean,
  root: HTMLElement
): HTMLElement | null => {
  let current: Node | null = node
  while (current && current !== root) {
    if (isElement(current) && predicate(current)) {
      return current
    }
    current = current.parentNode
  }
  return null
}

const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
}

const replaceTag = (element: HTMLElement, tagName: string): HTMLElement => {
  if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
    return element
  }
  const newElement = document.createElement(tagName)
  while (element.firstChild) {
    newElement.appendChild(element.firstChild)
  }
  element.replaceWith(newElement)
  return newElement
}

const wrapRangeWithElement = (range: Range, element: HTMLElement): Range => {
  const selection = getSelection()
  const contents = range.extractContents()
  element.appendChild(contents)
  range.insertNode(element)
  const newRange = document.createRange()
  newRange.selectNodeContents(element)
  if (selection) {
    selection.removeAllRanges()
    selection.addRange(newRange)
  }
  return newRange
}

const createPlaceholderRange = (range: Range, element: HTMLElement): Range => {
  element.appendChild(document.createTextNode('\u200b'))
  range.insertNode(element)
  const selection = getSelection()
  const newRange = document.createRange()
  newRange.selectNodeContents(element)
  newRange.collapse(false)
  if (selection) {
    selection.removeAllRanges()
    selection.addRange(newRange)
  }
  return newRange
}

export const wrapSelection = (
  root: HTMLElement,
  tagName: string,
  attributes: Record<string, string> = {}
) => {
  const range = getSelectionRange()
  if (!range) return
  ensureRangeWithinRoot(range, root)
  const element = document.createElement(tagName)
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
  if (range.collapsed) {
    createPlaceholderRange(range, element)
  } else {
    wrapRangeWithElement(range, element)
  }
}

export const applyInlineStyle = (root: HTMLElement, tagName: string, attributes: Record<string, string> = {}) => {
  const range = getSelectionRange()
  if (!range) return
  ensureRangeWithinRoot(range, root)

  const existing = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
    root
  )

  if (existing) {
    unwrapElement(existing)
    return
  }

  wrapSelection(root, tagName, attributes)
}

const getBlockAncestor = (node: Node, root: HTMLElement): HTMLElement | null => {
  return getClosestElement(
    node,
    (element) => BLOCK_TAGS.has(element.tagName.toLowerCase()),
    root
  )
}

export const toggleBlock = (root: HTMLElement, tagName: string, fallbackTag = 'p') => {
  const range = getSelectionRange()
  if (!range) return
  ensureRangeWithinRoot(range, root)

  const block = getBlockAncestor(range.startContainer, root)
  if (!block) {
    wrapSelection(root, tagName)
    return
  }

  const currentTag = block.tagName.toLowerCase()
  const targetTag = tagName.toLowerCase()

  const newTag = currentTag === targetTag ? fallbackTag : targetTag
  const replaced = replaceTag(block, newTag)

  const selection = getSelection()
  if (selection) {
    const newRange = document.createRange()
    newRange.selectNodeContents(replaced)
    newRange.collapse(false)
    selection.removeAllRanges()
    selection.addRange(newRange)
  }
}

const convertBlockToList = (block: HTMLElement, listTag: 'ul' | 'ol'): HTMLElement => {
  const list = document.createElement(listTag)
  const listItem = document.createElement('li')
  while (block.firstChild) {
    listItem.appendChild(block.firstChild)
  }
  list.appendChild(listItem)
  block.replaceWith(list)
  return listItem
}

const unwrapList = (list: HTMLElement) => {
  const parent = list.parentNode
  if (!parent) return
  const fragment = document.createDocumentFragment()
  Array.from(list.children).forEach((child) => {
    if (isElement(child) && child.tagName.toLowerCase() === 'li') {
      const paragraph = document.createElement('p')
      while (child.firstChild) {
        paragraph.appendChild(child.firstChild)
      }
      fragment.appendChild(paragraph)
    } else {
      fragment.appendChild(child)
    }
  })
  parent.replaceChild(fragment, list)
}

export const toggleList = (root: HTMLElement, listTag: 'ul' | 'ol') => {
  const range = getSelectionRange()
  if (!range) return
  ensureRangeWithinRoot(range, root)

  const listAncestor = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === listTag,
    root
  )

  if (listAncestor) {
    unwrapList(listAncestor)
    return
  }

  const block = getBlockAncestor(range.startContainer, root)
  if (block) {
    const listItem = convertBlockToList(block, listTag)
    const selection = getSelection()
    if (selection) {
      const newRange = document.createRange()
      newRange.selectNodeContents(listItem)
      selection.removeAllRanges()
      selection.addRange(newRange)
    }
    return
  }

  const list = document.createElement(listTag)
  const listItem = document.createElement('li')
  const contents = range.extractContents()
  if (!contents.childNodes.length) {
    listItem.appendChild(document.createTextNode('\u200b'))
  } else {
    listItem.appendChild(contents)
  }
  list.appendChild(listItem)
  range.insertNode(list)
  const selection = getSelection()
  if (selection) {
    const newRange = document.createRange()
    newRange.selectNodeContents(listItem)
    selection.removeAllRanges()
    selection.addRange(newRange)
  }
}

export const isInlineStyleActive = (root: HTMLElement, tagName: string): boolean => {
  const range = getSelectionRange()
  if (!range) return false
  try {
    ensureRangeWithinRoot(range, root)
  } catch {
    return false
  }
  return Boolean(
    getClosestElement(
      range.startContainer,
      (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
      root
    )
  )
}

export const isBlockActive = (root: HTMLElement, tagName: string): boolean => {
  const range = getSelectionRange()
  if (!range) return false
  try {
    ensureRangeWithinRoot(range, root)
  } catch {
    return false
  }
  const block = getBlockAncestor(range.startContainer, root)
  return block ? block.tagName.toLowerCase() === tagName.toLowerCase() : false
}

export const isListActive = (root: HTMLElement, listTag: 'ul' | 'ol'): boolean => {
  const range = getSelectionRange()
  if (!range) return false
  try {
    ensureRangeWithinRoot(range, root)
  } catch {
    return false
  }
  const listAncestor = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === listTag,
    root
  )
  return Boolean(listAncestor)
}

export const insertLink = (root: HTMLElement, url: string) => {
  wrapSelection(root, 'a', {
    href: url,
    target: '_blank',
    rel: 'noopener noreferrer',
  })
}

export const insertImage = (root: HTMLElement, url: string) => {
  const range = getSelectionRange()
  if (!range) return
  ensureRangeWithinRoot(range, root)
  const image = document.createElement('img')
  image.src = url
  range.insertNode(image)
  const selection = getSelection()
  if (selection) {
    const newRange = document.createRange()
    newRange.setStartAfter(image)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)
  }
}

export const clearFormatting = (root: HTMLElement) => {
  const range = getSelectionRange()
  if (!range) return
  ensureRangeWithinRoot(range, root)
  if (range.collapsed) return
  const text = range.toString()
  range.deleteContents()
  range.insertNode(document.createTextNode(text))
}
