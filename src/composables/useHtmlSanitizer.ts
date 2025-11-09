const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'EM', 'H1', 'H2', 'H3', 'HR', 'I', 'IMG',
  'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'UL', 'TABLE',
  'THEAD', 'TBODY', 'TR', 'TH', 'TD'
])

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['title'])
const UNWRAP_TAGS = new Set(['DIV'])

const ELEMENT_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target', 'title']),
  img: new Set(['alt', 'src', 'title', 'width', 'height', 'style']),
  table: new Set(['border', 'cellpadding', 'cellspacing', 'style']),
  td: new Set(['colspan', 'rowspan', 'style']),
  th: new Set(['colspan', 'rowspan', 'style']),
  span: new Set(['style']),
  p: new Set(['style']),
}

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|tel):|\/\/|\/|#)/i
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:[a-z0-9.+-]+);base64,/i

/**
 * Composable for HTML sanitization in the editor
 * Provides secure HTML cleaning and validation
 */
export function useHtmlSanitizer() {
  const sanitizeHtml = (input: string | null = ''): string => {
    const value = input ?? ''
    if (!value.trim()) return ''
    if (globalThis.window === undefined || document === undefined) return value

    const workingDocument = document.implementation.createHTMLDocument('sanitizer')
    workingDocument.body.innerHTML = value

    const sanitizeTree = (root: HTMLElement) => {
      let child: ChildNode | null = root.firstChild
      while (child) {
        const next = child.nextSibling
        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as HTMLElement
          if (ALLOWED_TAGS.has(element.tagName)) {
            sanitizeAttributes(element)
            sanitizeTree(element)
          } else if (UNWRAP_TAGS.has(element.tagName)) {
            unwrapElement(element)
          } else {
            element.remove()
          }
        }
        child = next
      }
    }

    const isAttributeAllowed = (attributeName: string, elementTag: string): boolean => {
      const allowed = new Set(GLOBAL_ALLOWED_ATTRIBUTES)
      const elementSpecific = ELEMENT_ALLOWED_ATTRIBUTES[elementTag.toLowerCase()]
      if (elementSpecific) {
        for (const attr of elementSpecific) {
          allowed.add(attr)
        }
      }
      return allowed.has(attributeName)
    }

    const validateAttributeValue = (element: HTMLElement, attributeName: string, attributeValue: string): boolean => {
      if (attributeName === 'href') {
        return SAFE_URL_PATTERN.test(attributeValue)
      }
      if (attributeName === 'src') {
        return SAFE_URL_PATTERN.test(attributeValue) || SAFE_DATA_IMAGE_PATTERN.test(attributeValue)
      }
      if (attributeName === 'target') {
        if (attributeValue !== '_blank' && attributeValue !== '_self') {
          element.setAttribute(attributeName, '_self')
        }
        return true
      }
      return true
    }

    const sanitizeAnchorElement = (element: HTMLElement) => {
      if (element.hasAttribute('href')) {
        const rel = element.getAttribute('rel') ?? ''
        const relTokens = new Set(rel.split(/\s+/).filter(Boolean))
        relTokens.add('noopener')
        relTokens.add('noreferrer')
        element.setAttribute('rel', Array.from(relTokens).join(' '))
      } else {
        element.removeAttribute('target')
        element.removeAttribute('rel')
      }
    }

    const sanitizeAttributes = (element: HTMLElement) => {
      for (const attribute of Array.from(element.attributes)) {
        const attributeName = attribute.name.toLowerCase()
        if (!isAttributeAllowed(attributeName, element.tagName)) {
          element.removeAttribute(attribute.name)
          continue
        }

        const attributeValue = attribute.value.trim()
        if (!validateAttributeValue(element, attributeName, attributeValue)) {
          element.removeAttribute(attribute.name)
        }
      }

      if (element.tagName === 'A') {
        sanitizeAnchorElement(element)
      }
    }

    const unwrapElement = (element: HTMLElement) => {
      const parent = element.parentNode
      if (!parent) return
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }
      element.remove()
    }

    const wrapOrphanTextNodes = (root: HTMLElement) => {
      const nodes = Array.from(root.childNodes)
      for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const textContent = node.textContent ?? ''
          if (!textContent.trim()) {
            node.remove()
            continue
          }
          const paragraph = workingDocument.createElement('p')
          paragraph.textContent = textContent.trim()
          node.replaceWith(paragraph)
        }
      }
    }

    const convertDivsToParagraphs = (root: HTMLElement) => {
      const divs = Array.from(root.querySelectorAll('div'))
      for (const div of divs) {
        const paragraph = workingDocument.createElement('p')
        while (div.firstChild) {
          paragraph.appendChild(div.firstChild)
        }
        if (!paragraph.innerHTML.trim()) {
          paragraph.innerHTML = '<br>'
        }
        div.replaceWith(paragraph)
      }
    }

    const normalizeListTextNode = (child: ChildNode) => {
      const textContent = child.textContent?.trim() ?? ''
      if (textContent) {
        const listItem = workingDocument.createElement('li')
        listItem.textContent = textContent
        child.replaceWith(listItem)
      } else {
        child.remove()
      }
    }

    const normalizeListElementNode = (child: ChildNode) => {
      const childElement = child as HTMLElement
      if (childElement.tagName !== 'LI') {
        const listItem = workingDocument.createElement('li')
        childElement.replaceWith(listItem)
        listItem.appendChild(childElement)
      }
    }

    const ensureListItemsHaveContent = (list: HTMLElement) => {
      for (const listItem of Array.from(list.querySelectorAll('li'))) {
        if (!listItem.innerHTML.trim()) {
          listItem.innerHTML = '<br>'
        }
      }
    }

    const normalizeLists = (root: HTMLElement) => {
      const lists = Array.from(root.querySelectorAll('ul, ol'))
      for (const list of lists) {
        const children = Array.from(list.childNodes)
        for (const child of children) {
          if (child.nodeType === Node.TEXT_NODE) {
            normalizeListTextNode(child)
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            normalizeListElementNode(child)
          }
        }
        ensureListItemsHaveContent(list as HTMLElement)
      }
    }

    const ensureBlockLineBreaks = (root: HTMLElement) => {
      const blocks = root.querySelectorAll('p, li')
      for (const block of blocks) {
        if (!block.innerHTML.trim()) {
          block.innerHTML = '<br>'
        }
      }
    }

    sanitizeTree(workingDocument.body)
    wrapOrphanTextNodes(workingDocument.body)
    convertDivsToParagraphs(workingDocument.body)
    normalizeLists(workingDocument.body)
    ensureBlockLineBreaks(workingDocument.body)
    workingDocument.body.normalize()

    return workingDocument.body.innerHTML
  }

  return {
    sanitizeHtml,
  }
}
