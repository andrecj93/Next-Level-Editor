import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getSelectionRange,
  saveSelection,
  restoreSelection,
  wrapSelection,
  applyInlineStyle,
  toggleBlock,
  toggleList,
  isInlineStyleActive,
  isBlockActive,
  isListActive,
  indentListItem,
  outdentListItem,
  insertLink,
  insertImage,
  clearFormatting,
} from '../formatting'

/** Select an entire node's contents and install the range as the live selection. */
const selectContents = (node: Node): Range => {
  const range = document.createRange()
  range.selectNodeContents(node)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  return range
}

/** Place a collapsed caret inside a text node at the given offset. */
const placeCaret = (textNode: Node, offset: number): Range => {
  const range = document.createRange()
  range.setStart(textNode, offset)
  range.collapse(true)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  return range
}

/** Install an explicit start/end text-offset range as the live selection. */
const selectRange = (
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number
): Range => {
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  return range
}

const clearSelection = () => {
  window.getSelection()!.removeAllRanges()
}

describe('Formatting Tests', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  describe('saveSelection and restoreSelection', () => {
    it('saves and restores a selection', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      const savedRange = saveSelection()
      expect(savedRange).toBeTruthy()

      // Clear selection
      selection.removeAllRanges()
      expect(selection.rangeCount).toBe(0)

      // Restore
      restoreSelection(savedRange)
      expect(selection.rangeCount).toBe(1)
      expect(selection.toString()).toBe('Hello')
    })

    it('handles null range in restoreSelection', () => {
      restoreSelection(null)
      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('wrapSelection', () => {
    it('wraps selected text in a tag', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      wrapSelection(root, 'strong')

      const strong = root.querySelector('strong')
      expect(strong).toBeTruthy()
      expect(strong!.textContent).toBe('Hello')
    })

    it('wraps with attributes', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      wrapSelection(root, 'span', { class: 'test-class', id: 'test-id' })

      const span = root.querySelector('span')
      expect(span).toBeTruthy()
      expect(span!.getAttribute('class')).toBe('test-class')
      expect(span!.getAttribute('id')).toBe('test-id')
    })
  })

  describe('applyInlineStyle', () => {
    it('applies bold style to selection', () => {
      root.innerHTML = '<p>Hello World</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.setEnd(p.firstChild!, 5)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      applyInlineStyle(root, 'strong')

      const strong = root.querySelector('strong')
      expect(strong).toBeTruthy()
      expect(strong!.textContent).toBe('Hello')
    })

    it('toggles style when already applied', () => {
      root.innerHTML = '<p><strong>Hello</strong> World</p>'
      const strong = root.querySelector('strong')!
      
      const range = document.createRange()
      range.selectNodeContents(strong)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      // Check if style is active before toggling
      const wasActive = isInlineStyleActive(root, 'strong')
      expect(wasActive).toBe(true)

      applyInlineStyle(root, 'strong')

      // The text should still be there
      expect(root.textContent).toContain('Hello')
      
      // But the strong tag should be gone
      const strongAfter = root.querySelector('strong')
      expect(strongAfter).toBeFalsy()
      
      // And bold should no longer be active
      expect(isInlineStyleActive(root, 'strong')).toBe(false)
    })
  })

  describe('toggleBlock', () => {
    it('converts paragraph to heading', () => {
      root.innerHTML = '<p>Test</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleBlock(root, 'h1')

      const h1 = root.querySelector('h1')
      expect(h1).toBeTruthy()
      expect(h1!.textContent).toBe('Test')
    })

    it('converts heading back to paragraph', () => {
      root.innerHTML = '<h1>Test</h1>'
      const h1 = root.querySelector('h1')!
      
      const range = document.createRange()
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleBlock(root, 'h1', 'p')

      const p = root.querySelector('p')
      expect(p).toBeTruthy()
      expect(root.querySelector('h1')).toBeFalsy()
    })
  })

  describe('toggleList', () => {
    it('converts paragraph to unordered list', () => {
      root.innerHTML = '<p>Item</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleList(root, 'ul')

      const ul = root.querySelector('ul')
      const li = root.querySelector('li')
      expect(ul).toBeTruthy()
      expect(li).toBeTruthy()
      expect(li!.textContent).toBe('Item')
    })

    it('converts list back to paragraphs', () => {
      root.innerHTML = '<ul><li>Item</li></ul>'
      const li = root.querySelector('li')!
      
      const range = document.createRange()
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleList(root, 'ul')

      const p = root.querySelector('p')
      expect(p).toBeTruthy()
      expect(root.querySelector('ul')).toBeFalsy()
    })

    it('creates ordered list', () => {
      root.innerHTML = '<p>Item</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      toggleList(root, 'ol')

      const ol = root.querySelector('ol')
      expect(ol).toBeTruthy()
    })
  })

  describe('isInlineStyleActive', () => {
    it('returns true when style is active', () => {
      root.innerHTML = '<p><strong>Bold</strong></p>'
      const strong = root.querySelector('strong')!
      
      const range = document.createRange()
      range.selectNodeContents(strong)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isInlineStyleActive(root, 'strong')).toBe(true)
    })

    it('returns false when style is not active', () => {
      root.innerHTML = '<p>Normal</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isInlineStyleActive(root, 'strong')).toBe(false)
    })
  })

  describe('isBlockActive', () => {
    it('returns true for matching block', () => {
      root.innerHTML = '<h1>Heading</h1>'
      const h1 = root.querySelector('h1')!
      
      const range = document.createRange()
      range.selectNodeContents(h1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isBlockActive(root, 'h1')).toBe(true)
    })

    it('returns false for non-matching block', () => {
      root.innerHTML = '<p>Paragraph</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isBlockActive(root, 'h1')).toBe(false)
    })
  })

  describe('isListActive', () => {
    it('returns true when in unordered list', () => {
      root.innerHTML = '<ul><li>Item</li></ul>'
      const li = root.querySelector('li')!
      
      const range = document.createRange()
      range.selectNodeContents(li)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isListActive(root, 'ul')).toBe(true)
    })

    it('returns false when not in list', () => {
      root.innerHTML = '<p>Item</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      expect(isListActive(root, 'ul')).toBe(false)
    })
  })

  describe('insertLink', () => {
    it('inserts link with URL', () => {
      root.innerHTML = '<p>Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.selectNodeContents(p)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertLink(root, 'https://example.com')

      const link = root.querySelector('a')
      expect(link).toBeTruthy()
      expect(link!.href).toBe('https://example.com/')
      expect(link!.target).toBe('_blank')
      expect(link!.rel).toBe('noopener noreferrer')
    })

    it('uses custom link text when the caret is collapsed', () => {
      root.innerHTML = '<p>x</p>'
      const p = root.querySelector('p')!
      const range = document.createRange()
      range.setStart(p.firstChild!, 1)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertLink(root, 'https://example.com', 'Click here')

      const link = root.querySelector('a')!
      expect(link.getAttribute('href')).toBe('https://example.com')
      expect(link.textContent).toBe('Click here')
    })

    it('falls back to the URL as text when no custom text is given', () => {
      root.innerHTML = '<p>x</p>'
      const p = root.querySelector('p')!
      const range = document.createRange()
      range.setStart(p.firstChild!, 1)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertLink(root, 'https://example.com')

      expect(root.querySelector('a')!.textContent).toBe('https://example.com')
    })

    it('updates an existing link in place instead of nesting a new anchor (caret inside)', () => {
      root.innerHTML = '<p><a href="https://old.com">Hello</a></p>'
      const anchorText = root.querySelector('a')!.firstChild!
      const range = document.createRange()
      range.setStart(anchorText, 2) // caret inside the link text
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertLink(root, 'https://new.com')

      const anchors = root.querySelectorAll('a')
      expect(anchors.length).toBe(1) // no nested/duplicate anchor
      expect(anchors[0].getAttribute('href')).toBe('https://new.com')
      expect(anchors[0].textContent).toBe('Hello')
      expect(root.querySelector('a a')).toBeNull()
    })

    it('updates an existing link in place when its text is selected', () => {
      root.innerHTML = '<p><a href="https://old.com">Hello</a></p>'
      const anchor = root.querySelector('a')!
      const range = document.createRange()
      range.selectNodeContents(anchor)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertLink(root, 'https://new.com')

      const anchors = root.querySelectorAll('a')
      expect(anchors.length).toBe(1)
      expect(anchors[0].getAttribute('href')).toBe('https://new.com')
      expect(anchors[0].textContent).toBe('Hello')
    })
  })

  describe('insertImage', () => {
    it('inserts image with URL', () => {
      root.innerHTML = '<p>Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertImage(root, 'https://example.com/image.jpg', 'Test image')

      const img = root.querySelector('img')
      expect(img).toBeTruthy()
      expect(img!.src).toBe('https://example.com/image.jpg')
      expect(img!.alt).toBe('Test image')
    })

    it('inserts image without alt text', () => {
      root.innerHTML = '<p>Text</p>'
      const p = root.querySelector('p')!
      
      const range = document.createRange()
      range.setStart(p.firstChild!, 0)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      insertImage(root, 'https://example.com/image.jpg')

      const img = root.querySelector('img')
      expect(img).toBeTruthy()
      expect(img!.alt).toBe('')
    })
  })

  describe('clearFormatting', () => {
    it('clears formatting from selected text', () => {
      root.innerHTML = '<p><strong><em>Formatted</em></strong></p>'
      const em = root.querySelector('em')!
      
      const range = document.createRange()
      range.selectNodeContents(em)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      clearFormatting(root)

      // The text should remain
      expect(root.textContent).toContain('Formatted')
    })

    it('does nothing when selection is collapsed', () => {
      root.innerHTML = '<p><strong>Formatted</strong></p>'
      const strong = root.querySelector('strong')!

      const range = document.createRange()
      range.setStart(strong.firstChild!, 0)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      clearFormatting(root)

      // Nothing should change for collapsed selection
      expect(root.querySelector('strong')).toBeTruthy()
    })

    it('strips wrapping formatting when the selection spans the formatted nodes', () => {
      // Selecting from the paragraph level (above the inline wrappers) means
      // deleteContents removes the <strong>/<em> and the plain text is re-inserted.
      root.innerHTML = '<p><strong><em>Bold italic</em></strong></p>'
      const p = root.querySelector('p')!
      selectRange(p, 0, p, p.childNodes.length)

      clearFormatting(root)

      expect(root.querySelector('strong')).toBeFalsy()
      expect(root.querySelector('em')).toBeFalsy()
      expect(root.textContent).toBe('Bold italic')
    })

    it('returns early when there is no selection', () => {
      root.innerHTML = '<p>untouched</p>'
      clearSelection()

      expect(() => clearFormatting(root)).not.toThrow()
      expect(root.innerHTML).toBe('<p>untouched</p>')
    })

    it('throws when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p>elsewhere</p>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('p')!)

      expect(() => clearFormatting(root)).toThrow('outside the editor root')

      document.body.removeChild(outside)
    })
  })

  describe('getSelectionRange', () => {
    it('returns the active range', () => {
      root.innerHTML = '<p>Hello</p>'
      const expected = selectContents(root.querySelector('p')!)
      const actual = getSelectionRange()
      expect(actual).toBeTruthy()
      expect(actual!.toString()).toBe(expected.toString())
    })

    it('returns null when there is no range', () => {
      clearSelection()
      expect(getSelectionRange()).toBeNull()
    })

    it('returns null when no getSelection API is available', () => {
      root.innerHTML = '<p>Fallback</p>'
      selectContents(root.querySelector('p')!)

      // In happy-dom window === globalThis, so removing window.getSelection also
      // removes globalThis.getSelection; both branches of getSelection() fail
      // and getSelectionRange resolves to null without throwing.
      const original = window.getSelection
      // @ts-expect-error - deliberately removing the API for this test
      window.getSelection = undefined
      try {
        expect(getSelectionRange()).toBeNull()
      } finally {
        window.getSelection = original
      }
    })
  })

  describe('saveSelection edge cases', () => {
    it('returns null when there is no selection to save', () => {
      clearSelection()
      expect(saveSelection()).toBeNull()
    })
  })

  describe('restoreSelection edge cases', () => {
    it('does not throw when restoring a real range after clearing', () => {
      root.innerHTML = '<p>Restore me</p>'
      const saved = selectContents(root.querySelector('p')!)
      clearSelection()

      restoreSelection(saved.cloneRange())
      expect(window.getSelection()!.toString()).toBe('Restore me')
    })

    it('does nothing when no selection API is available', () => {
      root.innerHTML = '<p>Restore me</p>'
      const saved = selectContents(root.querySelector('p')!).cloneRange()

      const original = window.getSelection
      // @ts-expect-error - deliberately removing the API for this test
      window.getSelection = undefined
      try {
        expect(() => restoreSelection(saved)).not.toThrow()
      } finally {
        window.getSelection = original
      }
    })
  })

  describe('wrapSelection edge cases', () => {
    it('returns early when there is no selection', () => {
      root.innerHTML = '<p>Nothing</p>'
      clearSelection()

      expect(() => wrapSelection(root, 'strong')).not.toThrow()
      expect(root.querySelector('strong')).toBeFalsy()
    })

    it('throws when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p>away</p>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('p')!)

      expect(() => wrapSelection(root, 'strong')).toThrow('outside the editor root')

      document.body.removeChild(outside)
    })

    it('inserts a zero-width placeholder for a collapsed caret', () => {
      root.innerHTML = '<p>abcd</p>'
      const text = root.querySelector('p')!.firstChild!
      placeCaret(text, 2)

      wrapSelection(root, 'strong')

      const strong = root.querySelector('strong')!
      expect(strong).toBeTruthy()
      // A zero-width space is inserted as the placeholder content.
      expect(strong.textContent).toBe('​')
    })
  })

  describe('applyInlineStyle - collapsed caret', () => {
    it('splits an existing inline element when toggled off at a caret', () => {
      root.innerHTML = '<p><strong>HelloWorld</strong></p>'
      const text = root.querySelector('strong')!.firstChild!
      placeCaret(text, 5)

      applyInlineStyle(root, 'strong')

      const strongs = root.querySelectorAll('strong')
      expect(strongs.length).toBe(2)
      expect(strongs[0].textContent).toBe('Hello')
      expect(strongs[1].textContent).toBe('World')
    })

    it('wraps a placeholder when the caret is not inside the target tag', () => {
      root.innerHTML = '<p>Hello</p>'
      const text = root.querySelector('p')!.firstChild!
      placeCaret(text, 2)

      applyInlineStyle(root, 'strong')

      const strong = root.querySelector('strong')!
      expect(strong).toBeTruthy()
      expect(strong.textContent).toBe('​')
    })

    it('returns early when there is no selection', () => {
      root.innerHTML = '<p>Hello</p>'
      clearSelection()

      expect(() => applyInlineStyle(root, 'strong')).not.toThrow()
      expect(root.querySelector('strong')).toBeFalsy()
    })

    it('throws when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p>gone</p>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('p')!)

      expect(() => applyInlineStyle(root, 'strong')).toThrow('outside the editor root')

      document.body.removeChild(outside)
    })

    it('splits at the start of an inline element (before-fragment empty)', () => {
      root.innerHTML = '<p><strong>Word</strong></p>'
      const text = root.querySelector('strong')!.firstChild!
      placeCaret(text, 0)

      applyInlineStyle(root, 'strong')

      // Caret at offset 0 leaves an empty before-wrapper and the whole word in
      // the after-wrapper: <strong></strong><strong>Word</strong>.
      const strongs = root.querySelectorAll('strong')
      expect(strongs.length).toBe(2)
      expect(strongs[0].textContent).toBe('')
      expect(strongs[1].textContent).toBe('Word')
    })

    it('preserves attributes on both halves when splitting at a caret', () => {
      root.innerHTML = '<p><a href="x">HelloWorld</a></p>'
      const text = root.querySelector('a')!.firstChild!
      placeCaret(text, 5)

      applyInlineStyle(root, 'a', { href: 'x', class: 'lnk' })

      const anchors = root.querySelectorAll('a')
      expect(anchors.length).toBe(2)
      expect(anchors[0].textContent).toBe('Hello')
      expect(anchors[1].textContent).toBe('World')
      // wrapNodes applied the attribute map to each new wrapper.
      expect(anchors[0].getAttribute('class')).toBe('lnk')
      expect(anchors[1].getAttribute('href')).toBe('x')
    })
  })

  describe('applyInlineStyle - selection removal', () => {
    it('removes the tag when the whole selection is fully styled', () => {
      root.innerHTML = '<p><strong>Hello</strong></p>'
      selectContents(root.querySelector('strong')!)

      applyInlineStyle(root, 'strong')

      expect(root.querySelector('strong')).toBeFalsy()
      expect(root.textContent).toBe('Hello')
    })

    it('unwraps nested matching elements while keeping inner formatting', () => {
      root.innerHTML = '<p><strong>aa<em>bb</em>cc</strong></p>'
      const strong = root.querySelector('strong')!
      selectRange(strong.firstChild!, 0, strong.lastChild!, 2)

      applyInlineStyle(root, 'strong')

      expect(root.querySelector('strong')).toBeFalsy()
      // The nested <em> survives; only <strong> is stripped.
      expect(root.querySelector('em')!.textContent).toBe('bb')
      expect(root.textContent).toBe('aabbcc')
    })

    it('wraps rather than removes when the selection is not fully styled', () => {
      root.innerHTML = '<p><strong>Hello</strong> plain</p>'
      const p = root.querySelector('p')!
      // Select from inside the strong across the un-styled " plain" text.
      selectRange(p.querySelector('strong')!.firstChild!, 0, p.lastChild!, 6)

      applyInlineStyle(root, 'strong')

      // Not fully styled -> a new wrapper is added, the text is preserved.
      expect(root.textContent).toBe('Hello plain')
      expect(root.querySelectorAll('strong').length).toBeGreaterThan(0)
    })

    it('unwraps nested duplicate wrappers of the same tag', () => {
      // A <strong> nested inside another <strong>: removal must flatten both,
      // exercising unwrapMatchingElements + unwrapElement.
      root.innerHTML = '<p><strong>aa<strong>bb</strong>cc</strong></p>'
      selectContents(root.querySelector('strong')!)

      applyInlineStyle(root, 'strong')

      expect(root.querySelector('strong')).toBeFalsy()
      expect(root.textContent).toBe('aabbcc')
    })

    it('unstyles a prefix slice of a styled run', () => {
      // Selecting "He" in <strong>Hello</strong> and toggling bold off must
      // actually unbold "He", leaving He<strong>llo</strong>.
      root.innerHTML = '<p><strong>Hello</strong></p>'
      const text = root.querySelector('strong')!.firstChild!
      selectRange(text, 0, text, 2)

      applyInlineStyle(root, 'strong')

      expect(root.textContent).toBe('Hello')
      expect(root.querySelectorAll('strong').length).toBe(1)
      expect(root.querySelector('strong')!.textContent).toBe('llo')
    })

    it('unstyles a suffix slice of a styled run', () => {
      root.innerHTML = '<p><strong>Hello</strong></p>'
      const text = root.querySelector('strong')!.firstChild!
      selectRange(text, 2, text, 5)

      applyInlineStyle(root, 'strong')

      expect(root.querySelector('strong')!.textContent).toBe('He')
      expect(root.textContent).toBe('Hello')
    })

    it('splits a styled run when unstyling an interior slice', () => {
      root.innerHTML = '<p><strong>Hello</strong></p>'
      const text = root.querySelector('strong')!.firstChild!
      selectRange(text, 1, text, 4)

      applyInlineStyle(root, 'strong')

      const strongs = [...root.querySelectorAll('strong')].map(s => s.textContent)
      expect(strongs).toEqual(['H', 'o'])
      expect(root.textContent).toBe('Hello')
    })

    it('preserves attributes on the surviving slices when unstyling a link', () => {
      root.innerHTML = '<p><a href="https://x.test">Hello</a></p>'
      const text = root.querySelector('a')!.firstChild!
      selectRange(text, 0, text, 2)

      applyInlineStyle(root, 'a')

      const link = root.querySelector('a')!
      expect(link.textContent).toBe('llo')
      expect(link.getAttribute('href')).toBe('https://x.test')
    })
  })

  describe('toggleBlock - multi-block and edge cases', () => {
    it('converts every block in a multi-block selection', () => {
      root.innerHTML = '<p>One</p><p>Two</p>'
      const ps = root.querySelectorAll('p')
      selectRange(ps[0].firstChild!, 0, ps[1].firstChild!, 3)

      toggleBlock(root, 'h2')

      const headings = root.querySelectorAll('h2')
      expect(headings.length).toBe(2)
      expect(headings[0].textContent).toBe('One')
      expect(headings[1].textContent).toBe('Two')
      expect(root.querySelector('p')).toBeFalsy()
    })

    it('keeps document order when converting three blocks', () => {
      root.innerHTML = '<p>one</p><p>two</p><p>three</p>'
      const ps = root.querySelectorAll('p')
      selectRange(ps[0].firstChild!, 0, ps[2].firstChild!, 5)

      toggleBlock(root, 'h3')

      const headings = Array.from(root.querySelectorAll('h3')).map(
        (h) => h.textContent
      )
      expect(headings).toEqual(['one', 'two', 'three'])
    })

    it('wraps content in the tag when there is no block ancestor', () => {
      root.innerHTML = 'plain text'
      selectRange(root.firstChild!, 0, root.firstChild!, 5)

      toggleBlock(root, 'h1')

      const h1 = root.querySelector('h1')!
      expect(h1).toBeTruthy()
      expect(h1.textContent).toBe('plain')
    })

    it('converts a block back to the fallback tag when it already matches', () => {
      root.innerHTML = '<h1>Same</h1>'
      selectContents(root.querySelector('h1')!)

      toggleBlock(root, 'h1', 'p')

      // Already an <h1> -> convert to the fallback <p>.
      expect(root.querySelector('h1')).toBeFalsy()
      expect(root.querySelector('p')!.textContent).toBe('Same')
    })

    it('converts an orphan list item (parent not a list) into the target tag', () => {
      // A stray <li> directly inside a <div>: unnestListItem falls back to a
      // plain tag swap instead of splitting a list.
      root.innerHTML = '<div><li>hello</li></div>'
      selectContents(root.querySelector('li')!)
      window.getSelection()!.getRangeAt(0).collapse(true)

      toggleBlock(root, 'h2')

      expect(root.querySelector('li')).toBeFalsy()
      expect(root.querySelector('h2')!.textContent).toBe('hello')
    })

    it('unnests a list item when converting it to a heading', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li></ul>'
      const first = root.querySelectorAll('li')[0]
      selectContents(first)
      window.getSelection()!.getRangeAt(0).collapse(true)

      toggleBlock(root, 'h1')

      const h1 = root.querySelector('h1')!
      expect(h1).toBeTruthy()
      expect(h1.textContent).toBe('a')
      // The heading is unnested out of the list; the remaining item stays in a
      // (trailing) list. Result: <ul></ul><h1>a</h1><ul><li>b</li></ul>.
      const remainingItem = root.querySelector('li')!
      expect(remainingItem.textContent).toBe('b')
      expect(remainingItem.closest('ul')).toBeTruthy()
    })

    it('returns early when there is no selection', () => {
      root.innerHTML = '<p>Keep</p>'
      clearSelection()

      expect(() => toggleBlock(root, 'h1')).not.toThrow()
      expect(root.innerHTML).toBe('<p>Keep</p>')
    })

    it('throws when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p>x</p>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('p')!)

      expect(() => toggleBlock(root, 'h1')).toThrow('outside the editor root')

      document.body.removeChild(outside)
    })
  })

  describe('toggleList - switching, toggling off, multi-block', () => {
    it('switches an unordered list to an ordered list in place', () => {
      root.innerHTML = '<ul><li>a</li></ul>'
      selectContents(root.querySelector('li')!)

      toggleList(root, 'ol')

      expect(root.querySelector('ol')).toBeTruthy()
      expect(root.querySelector('ul')).toBeFalsy()
      expect(root.querySelector('li')!.textContent).toBe('a')
    })

    it('toggles a single-item list off into a paragraph', () => {
      root.innerHTML = '<ul><li>Item</li></ul>'
      selectContents(root.querySelector('li')!)

      toggleList(root, 'ul')

      expect(root.querySelector('ul')).toBeFalsy()
      expect(root.querySelector('p')!.textContent).toBe('Item')
    })

    it('unwraps the whole list when the selection spans multiple items', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li></ul>'
      const lis = root.querySelectorAll('li')
      selectRange(lis[0].firstChild!, 0, lis[1].firstChild!, 1)

      toggleList(root, 'ul')

      expect(root.querySelector('ul')).toBeFalsy()
      const ps = root.querySelectorAll('p')
      expect(ps.length).toBe(2)
      expect(ps[0].textContent).toBe('a')
      expect(ps[1].textContent).toBe('b')
    })

    it('preserves non-list-item children when unwrapping a list', () => {
      // A stray non-<li> node inside the list is kept as-is; <li>s become <p>s.
      root.innerHTML = '<ul><li>a</li><div>keep</div><li>b</li></ul>'
      const lis = root.querySelectorAll('li')
      selectRange(lis[0].firstChild!, 0, lis[1].firstChild!, 1)

      toggleList(root, 'ul')

      expect(root.querySelector('ul')).toBeFalsy()
      expect(root.querySelector('div')!.textContent).toBe('keep')
      const ps = root.querySelectorAll('p')
      expect(ps[0].textContent).toBe('a')
      expect(ps[1].textContent).toBe('b')
    })

    it('splits the list when toggling off a middle item', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li><li>c</li></ul>'
      const middle = root.querySelectorAll('li')[1]
      selectContents(middle)
      window.getSelection()!.getRangeAt(0).collapse(true)

      toggleList(root, 'ul')

      // Middle becomes a paragraph, flanked by two lists.
      expect(root.querySelector('p')!.textContent).toBe('b')
      const lists = root.querySelectorAll('ul')
      expect(lists.length).toBe(2)
      expect(lists[0].textContent).toBe('a')
      expect(lists[1].textContent).toBe('c')
    })

    it('toggling off the last item leaves a leading list and a trailing paragraph', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li></ul>'
      const last = root.querySelectorAll('li')[1]
      selectContents(last)
      window.getSelection()!.getRangeAt(0).collapse(true)

      toggleList(root, 'ul')

      // No items follow "b", so only a single (leading) list remains.
      const lists = root.querySelectorAll('ul')
      expect(lists.length).toBe(1)
      expect(lists[0].textContent).toBe('a')
      expect(root.querySelector('p')!.textContent).toBe('b')
    })

    it('wraps a multi-block selection into a single list', () => {
      root.innerHTML = '<p>a</p><p>b</p>'
      const ps = root.querySelectorAll('p')
      selectRange(ps[0].firstChild!, 0, ps[1].firstChild!, 1)

      toggleList(root, 'ol')

      const ol = root.querySelector('ol')!
      expect(ol).toBeTruthy()
      const items = ol.querySelectorAll('li')
      expect(items.length).toBe(2)
      expect(items[0].textContent).toBe('a')
      expect(items[1].textContent).toBe('b')
      expect(root.querySelectorAll('ol').length).toBe(1)
    })

    it('wraps an extracted range into a list when there is no block ancestor', () => {
      root.innerHTML = 'bare text here'
      selectRange(root.firstChild!, 0, root.firstChild!, 4)

      toggleList(root, 'ul')

      const li = root.querySelector('li')!
      expect(li).toBeTruthy()
      expect(li.textContent).toBe('bare')
    })

    it('inserts a placeholder list item for a collapsed caret with no block', () => {
      root.innerHTML = 'baretext'
      placeCaret(root.firstChild!, 4)

      toggleList(root, 'ul')

      const li = root.querySelector('li')!
      expect(li).toBeTruthy()
      // Empty extracted contents -> zero-width placeholder.
      expect(li.textContent).toBe('​')
    })

    it('returns early when there is no selection', () => {
      root.innerHTML = '<p>Keep</p>'
      clearSelection()

      expect(() => toggleList(root, 'ul')).not.toThrow()
      expect(root.innerHTML).toBe('<p>Keep</p>')
    })

    it('throws when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p>x</p>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('p')!)

      expect(() => toggleList(root, 'ul')).toThrow('outside the editor root')

      document.body.removeChild(outside)
    })
  })

  describe('indentListItem', () => {
    it('moves an item into a new nested list under its previous sibling', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li></ul>'
      const second = root.querySelectorAll('li')[1]
      placeCaret(second.firstChild!, 0)

      const result = indentListItem(root)

      expect(result).toBe(true)
      const first = root.querySelector('ul')!.querySelector('li')!
      const nested = first.querySelector('ul')!
      expect(nested).toBeTruthy()
      expect(nested.querySelector('li')!.textContent).toBe('b')
    })

    it('reuses an existing nested list on the previous sibling', () => {
      root.innerHTML = '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'
      const liC = root.querySelectorAll('li')[2]
      placeCaret(liC.firstChild!, 0)

      const result = indentListItem(root)

      expect(result).toBe(true)
      const nested = root.querySelector('ul')!.querySelector('li')!.querySelector('ul')!
      const nestedItems = nested.querySelectorAll('li')
      expect(nestedItems.length).toBe(2)
      expect(nestedItems[0].textContent).toBe('b')
      expect(nestedItems[1].textContent).toBe('c')
    })

    it('indents EVERY selected sibling item, not just the caret one', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li><li>c</li></ul>'
      const items = root.querySelectorAll('li')
      // Select across b and c.
      const range = document.createRange()
      range.setStart(items[1].firstChild!, 0)
      range.setEnd(items[2].firstChild!, 1)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      const result = indentListItem(root)

      expect(result).toBe(true)
      const top = root.querySelector('ul')!.children
      // Only "a" stays at the top level; b and c are both nested under it.
      expect(top.length).toBe(1)
      expect(top[0].textContent).toContain('a')
      const nested = top[0].querySelector('ul')!.querySelectorAll('li')
      expect(nested.length).toBe(2)
      expect(nested[0].textContent).toBe('b')
      expect(nested[1].textContent).toBe('c')
    })

    it('returns false when there is no previous sibling', () => {
      root.innerHTML = '<ul><li>only</li></ul>'
      placeCaret(root.querySelector('li')!.firstChild!, 0)

      expect(indentListItem(root)).toBe(false)
    })

    it('returns false when the item is not directly inside a list element', () => {
      // Malformed DOM: two <li> siblings whose parent is a <div>, not a list.
      root.innerHTML = '<div><li>a</li><li>b</li></div>'
      placeCaret(root.querySelectorAll('li')[1].firstChild!, 0)

      expect(indentListItem(root)).toBe(false)
    })

    it('returns false when the caret is not inside a list item', () => {
      root.innerHTML = '<p>not a list</p>'
      placeCaret(root.querySelector('p')!.firstChild!, 0)

      expect(indentListItem(root)).toBe(false)
    })

    it('returns false when there is no selection', () => {
      clearSelection()
      expect(indentListItem(root)).toBe(false)
    })

    it('returns false when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<ul><li>a</li><li>b</li></ul>'
      document.body.appendChild(outside)
      placeCaret(outside.querySelectorAll('li')[1].firstChild!, 0)

      expect(indentListItem(root)).toBe(false)

      document.body.removeChild(outside)
    })
  })

  describe('outdentListItem', () => {
    it('promotes a nested item and removes the now-empty nested list', () => {
      root.innerHTML = '<ul><li>a<ul><li>b</li></ul></li></ul>'
      const inner = root.querySelectorAll('li')[1]
      placeCaret(inner.firstChild!, 0)

      const result = outdentListItem(root)

      expect(result).toBe(true)
      const topItems = root.querySelector('ul')!.children
      expect(topItems.length).toBe(2)
      expect(topItems[0].textContent).toBe('a')
      expect(topItems[1].textContent).toBe('b')
      // The nested <ul> is gone once empty.
      expect(root.querySelector('li')!.querySelector('ul')).toBeFalsy()
    })

    it('outdenting a non-last nested item carries its following siblings with it (no reorder)', () => {
      root.innerHTML = '<ul><li>a<ul><li>b</li><li>c</li></ul></li></ul>'
      const b = root.querySelectorAll('li')[1]
      placeCaret(b.firstChild!, 0)

      const result = outdentListItem(root)

      expect(result).toBe(true)
      const topItems = root.querySelector('ul')!.children
      // Order must stay a, b, c. b is promoted next to a, and c (which followed
      // b) travels WITH b as its nested child — otherwise c would stay under a
      // and render ABOVE b. (Previously this reordered to "a > [c]", then b.)
      expect(topItems.length).toBe(2)
      expect(topItems[0].textContent).toBe('a')
      expect(topItems[1].textContent).toContain('b')
      // a no longer holds the nested list; c is nested under b.
      expect(topItems[0].querySelector('ul')).toBeFalsy()
      expect(
        topItems[1].querySelector('ul')!.querySelector('li')!.textContent
      ).toBe('c')
    })

    it('inserts the promoted item before the grandparent\'s next sibling', () => {
      // The grandparent <li> ("a") has a following sibling ("d") in the outer
      // list, so the promoted item is inserted before it (not appended).
      root.innerHTML = '<ul><li>a<ul><li>b</li></ul></li><li>d</li></ul>'
      const b = root.querySelectorAll('li')[1]
      placeCaret(b.firstChild!, 0)

      const result = outdentListItem(root)

      expect(result).toBe(true)
      const topItems = Array.from(root.querySelector('ul')!.children).map(
        (el) => el.textContent
      )
      expect(topItems).toEqual(['a', 'b', 'd'])
    })

    it('returns false when the grandparent list item is not inside a list', () => {
      // parentList (inner ul) -> grandparent <li> -> parent is a <div>, not a list.
      root.innerHTML = '<div><li>outer<ul><li>inner</li></ul></li></div>'
      placeCaret(root.querySelectorAll('li')[1].firstChild!, 0)

      expect(outdentListItem(root)).toBe(false)
    })

    it('returns false when the item is not directly inside a list element', () => {
      root.innerHTML = '<div><li>lonely</li></div>'
      placeCaret(root.querySelector('li')!.firstChild!, 0)

      expect(outdentListItem(root)).toBe(false)
    })

    it('returns false when the item is not in a nested list', () => {
      root.innerHTML = '<ul><li>a</li><li>b</li></ul>'
      placeCaret(root.querySelectorAll('li')[0].firstChild!, 0)

      expect(outdentListItem(root)).toBe(false)
    })

    it('returns false when the caret is not inside a list item', () => {
      root.innerHTML = '<p>flat</p>'
      placeCaret(root.querySelector('p')!.firstChild!, 0)

      expect(outdentListItem(root)).toBe(false)
    })

    it('returns false when there is no selection', () => {
      clearSelection()
      expect(outdentListItem(root)).toBe(false)
    })

    it('returns false when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<ul><li>a<ul><li>b</li></ul></li></ul>'
      document.body.appendChild(outside)
      placeCaret(outside.querySelectorAll('li')[1].firstChild!, 0)

      expect(outdentListItem(root)).toBe(false)

      document.body.removeChild(outside)
    })
  })

  describe('isInlineStyleActive / isBlockActive / isListActive - no selection & outside root', () => {
    it('isInlineStyleActive returns false with no selection', () => {
      clearSelection()
      expect(isInlineStyleActive(root, 'strong')).toBe(false)
    })

    it('isInlineStyleActive returns false when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p><strong>x</strong></p>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('strong')!)

      expect(isInlineStyleActive(root, 'strong')).toBe(false)

      document.body.removeChild(outside)
    })

    it('isBlockActive returns false with no selection', () => {
      clearSelection()
      expect(isBlockActive(root, 'h1')).toBe(false)
    })

    it('isBlockActive returns false when there is no block ancestor', () => {
      root.innerHTML = 'loose text'
      selectRange(root.firstChild!, 0, root.firstChild!, 5)
      expect(isBlockActive(root, 'p')).toBe(false)
    })

    it('isBlockActive returns false when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<h1>x</h1>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('h1')!)

      expect(isBlockActive(root, 'h1')).toBe(false)

      document.body.removeChild(outside)
    })

    it('isListActive returns false with no selection', () => {
      clearSelection()
      expect(isListActive(root, 'ul')).toBe(false)
    })

    it('isListActive returns false when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<ul><li>x</li></ul>'
      document.body.appendChild(outside)
      selectContents(outside.querySelector('li')!)

      expect(isListActive(root, 'ul')).toBe(false)

      document.body.removeChild(outside)
    })

    it('isListActive distinguishes ul from ol', () => {
      root.innerHTML = '<ol><li>x</li></ol>'
      selectContents(root.querySelector('li')!)
      expect(isListActive(root, 'ol')).toBe(true)
      expect(isListActive(root, 'ul')).toBe(false)
    })
  })

  describe('insertLink / insertImage - no selection & wrapping', () => {
    it('insertLink returns early when there is no selection', () => {
      root.innerHTML = '<p>Keep</p>'
      clearSelection()

      expect(() => insertLink(root, 'https://example.com')).not.toThrow()
      expect(root.querySelector('a')).toBeFalsy()
    })

    it('insertLink wraps a non-collapsed selection as an anchor', () => {
      root.innerHTML = '<p>Wrap me</p>'
      selectContents(root.querySelector('p')!)

      insertLink(root, 'https://example.com')

      const link = root.querySelector('a')!
      expect(link).toBeTruthy()
      expect(link.getAttribute('href')).toBe('https://example.com')
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link.textContent).toBe('Wrap me')
    })

    it('insertImage returns early when there is no selection', () => {
      root.innerHTML = '<p>Keep</p>'
      clearSelection()

      expect(() => insertImage(root, 'https://example.com/a.png')).not.toThrow()
      expect(root.querySelector('img')).toBeFalsy()
    })

    it('insertImage wraps the image and appends a trailing paragraph', () => {
      root.innerHTML = '<p>Here</p>'
      placeCaret(root.querySelector('p')!.firstChild!, 4)

      insertImage(root, 'https://example.com/pic.png', 'A picture')

      const wrapper = root.querySelector('.editor-image-wrapper')!
      expect(wrapper).toBeTruthy()
      expect(wrapper.getAttribute('contenteditable')).toBe('false')
      const img = wrapper.querySelector('img')!
      expect(img.getAttribute('alt')).toBe('A picture')
      // A paragraph with a zero-width space is inserted after the wrapper.
      expect(wrapper.nextElementSibling!.tagName.toLowerCase()).toBe('p')
      expect(wrapper.nextElementSibling!.textContent).toBe('​')
    })

    it('insertImage throws when the selection is outside the root', () => {
      const outside = document.createElement('div')
      outside.innerHTML = '<p>x</p>'
      document.body.appendChild(outside)
      placeCaret(outside.querySelector('p')!.firstChild!, 0)

      expect(() => insertImage(root, 'https://example.com/x.png')).toThrow(
        'outside the editor root'
      )

      document.body.removeChild(outside)
    })
  })
})
