import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toggleBlock, toggleList, applyInlineStyle } from '../formatting'

/**
 * Focused coverage for multi-block heading/paragraph conversion, multi-block
 * list creation, ul<->ol conversion, and single-item list toggle-off.
 * See cluster "formatting-multiblock" (#1, #2, #3, #7).
 */
describe('Formatting multi-block behaviour', () => {
  let root: HTMLElement

  const selectAcrossBlocks = (startEl: Element, endEl: Element) => {
    const range = document.createRange()
    range.setStart(startEl.firstChild ?? startEl, 0)
    const endNode = endEl.firstChild ?? endEl
    const endOffset =
      endNode.nodeType === Node.TEXT_NODE
        ? (endNode.textContent?.length ?? 0)
        : endNode.childNodes.length
    range.setEnd(endNode, endOffset)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    return range
  }

  const placeCaret = (el: Element, offset = 0) => {
    const range = document.createRange()
    const node = el.firstChild ?? el
    range.setStart(node, offset)
    range.collapse(true)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    return range
  }

  beforeEach(() => {
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  describe('#1 toggleBlock over multiple blocks', () => {
    it('converts EVERY paragraph in a multi-block selection to headings', () => {
      root.innerHTML = '<p>One</p><p>Two</p><p>Three</p>'
      const paras = root.querySelectorAll('p')
      selectAcrossBlocks(paras[0], paras[2])

      toggleBlock(root, 'h2')

      const headings = root.querySelectorAll('h2')
      expect(headings.length).toBe(3)
      expect(root.querySelectorAll('p').length).toBe(0)
      expect(Array.from(headings).map((h) => h.textContent)).toEqual([
        'One',
        'Two',
        'Three',
      ])
    })

    it('converts a multi-block selection of mixed headings to paragraphs', () => {
      root.innerHTML = '<h1>A</h1><h1>B</h1>'
      const headings = root.querySelectorAll('h1')
      selectAcrossBlocks(headings[0], headings[1])

      toggleBlock(root, 'h1', 'p')

      // Every intersected h1 becomes a paragraph.
      expect(root.querySelectorAll('h1').length).toBe(0)
      const paras = root.querySelectorAll('p')
      expect(paras.length).toBe(2)
      expect(Array.from(paras).map((p) => p.textContent)).toEqual(['A', 'B'])
    })

    it('applies the heading uniformly to a MIXED selection (Word behavior)', () => {
      // [h1, p, p] + H1 must yield [h1, h1, h1] — the toggle decision is made
      // once for the whole selection, not per block (which produced the
      // inverted [p, h1, h1]).
      root.innerHTML = '<h1>One</h1><p>Two</p><p>Three</p>'
      const first = root.querySelector('h1')!
      const last = root.querySelectorAll('p')[1]
      selectAcrossBlocks(first, last)

      toggleBlock(root, 'h1')

      const headings = root.querySelectorAll('h1')
      expect(headings.length).toBe(3)
      expect(root.querySelectorAll('p').length).toBe(0)
      expect(Array.from(headings).map((h) => h.textContent)).toEqual([
        'One',
        'Two',
        'Three',
      ])
    })

    it('toggles OFF to the fallback only when EVERY block matches the target', () => {
      root.innerHTML = '<h1>A</h1><h1>B</h1>'
      const headings = root.querySelectorAll('h1')
      selectAcrossBlocks(headings[0], headings[1])

      toggleBlock(root, 'h1', 'p')

      expect(root.querySelectorAll('h1').length).toBe(0)
      const paras = root.querySelectorAll('p')
      expect(paras.length).toBe(2)
      expect(Array.from(paras).map((p) => p.textContent)).toEqual(['A', 'B'])
    })

    it('reselects the converted blocks', () => {
      root.innerHTML = '<p>One</p><p>Two</p>'
      const paras = root.querySelectorAll('p')
      selectAcrossBlocks(paras[0], paras[1])

      toggleBlock(root, 'h3')

      const selection = window.getSelection()!
      expect(selection.rangeCount).toBe(1)
      // Selection should span the two new h3 blocks.
      expect(selection.toString()).toContain('One')
      expect(selection.toString()).toContain('Two')
    })

    it('still converts a single collapsed-caret block (single-block path)', () => {
      root.innerHTML = '<p>Solo</p>'
      const p = root.querySelector('p')!
      placeCaret(p)

      toggleBlock(root, 'h1')

      expect(root.querySelector('h1')).toBeTruthy()
      expect(root.querySelector('h1')!.textContent).toBe('Solo')
      expect(root.querySelector('p')).toBeFalsy()
    })
  })

  describe('#2 toggleList wraps all blocks into ONE list', () => {
    it('wraps a multi-block selection into a single <ul> with one <li> each', () => {
      root.innerHTML = '<p>One</p><p>Two</p><p>Three</p>'
      const paras = root.querySelectorAll('p')
      selectAcrossBlocks(paras[0], paras[2])

      toggleList(root, 'ul')

      const uls = root.querySelectorAll('ul')
      expect(uls.length).toBe(1)
      const items = uls[0].querySelectorAll('li')
      expect(items.length).toBe(3)
      expect(Array.from(items).map((li) => li.textContent)).toEqual([
        'One',
        'Two',
        'Three',
      ])
      // Original paragraphs must be gone.
      expect(root.querySelectorAll('p').length).toBe(0)
    })

    it('wraps a multi-block selection into a single <ol>', () => {
      root.innerHTML = '<p>Alpha</p><p>Beta</p>'
      const paras = root.querySelectorAll('p')
      selectAcrossBlocks(paras[0], paras[1])

      toggleList(root, 'ol')

      expect(root.querySelectorAll('ol').length).toBe(1)
      expect(root.querySelectorAll('ol > li').length).toBe(2)
    })

    it('keeps the single-block behaviour for a collapsed caret', () => {
      root.innerHTML = '<p>Only</p>'
      const p = root.querySelector('p')!
      placeCaret(p)

      toggleList(root, 'ul')

      expect(root.querySelectorAll('ul').length).toBe(1)
      expect(root.querySelectorAll('li').length).toBe(1)
      expect(root.querySelector('li')!.textContent).toBe('Only')
    })
  })

  describe('#3 switching list type retags in place', () => {
    it('converts a <ul> to an <ol> without nesting', () => {
      root.innerHTML = '<ul><li>Item A</li><li>Item B</li></ul>'
      const firstLi = root.querySelector('li')!
      placeCaret(firstLi)

      toggleList(root, 'ol')

      // No invalid nesting.
      expect(root.querySelector('ul')).toBeFalsy()
      expect(root.querySelector('ol ul')).toBeFalsy()
      expect(root.querySelector('ul ol')).toBeFalsy()

      const ol = root.querySelector('ol')!
      expect(ol).toBeTruthy()
      // The list retagged in place, keeping its items.
      const items = ol.querySelectorAll('li')
      expect(items.length).toBe(2)
      expect(Array.from(items).map((li) => li.textContent)).toEqual([
        'Item A',
        'Item B',
      ])
      // Exactly one list element total.
      expect(root.querySelectorAll('ol, ul').length).toBe(1)
    })

    it('converts an <ol> back to a <ul> in place', () => {
      root.innerHTML = '<ol><li>One</li><li>Two</li></ol>'
      const firstLi = root.querySelector('li')!
      placeCaret(firstLi)

      toggleList(root, 'ul')

      expect(root.querySelector('ol')).toBeFalsy()
      const ul = root.querySelector('ul')!
      expect(ul).toBeTruthy()
      expect(ul.querySelectorAll('li').length).toBe(2)
      expect(root.querySelectorAll('ol, ul').length).toBe(1)
    })
  })

  describe('#7 collapsed toggle-off affects only the current item', () => {
    it('converts only the current <li> to a paragraph, splitting the list', () => {
      root.innerHTML = '<ul><li>First</li><li>Second</li><li>Third</li></ul>'
      const secondLi = root.querySelectorAll('li')[1]
      placeCaret(secondLi)

      toggleList(root, 'ul')

      // The middle item becomes a paragraph; the list splits around it.
      const paras = root.querySelectorAll('p')
      expect(paras.length).toBe(1)
      expect(paras[0].textContent).toBe('Second')

      // Two separate lists remain (First / Third), not one.
      const lists = root.querySelectorAll('ul')
      expect(lists.length).toBe(2)
      const remainingItems = Array.from(root.querySelectorAll('li')).map(
        (li) => li.textContent
      )
      expect(remainingItems).toEqual(['First', 'Third'])
    })

    it('does NOT convert the entire list when toggling off a single caret', () => {
      root.innerHTML = '<ul><li>Keep me</li><li>Also keep</li></ul>'
      const firstLi = root.querySelector('li')!
      placeCaret(firstLi)

      toggleList(root, 'ul')

      // Only one item left the list.
      expect(root.querySelectorAll('p').length).toBe(1)
      expect(root.querySelectorAll('li').length).toBe(1)
      expect(root.querySelector('li')!.textContent).toBe('Also keep')
    })

    it('unwraps the whole list when the selection spans multiple items', () => {
      root.innerHTML = '<ul><li>Alpha</li><li>Beta</li></ul>'
      const items = root.querySelectorAll('li')
      selectAcrossBlocks(items[0], items[1])

      toggleList(root, 'ul')

      // Whole list unwrapped -> both items become paragraphs.
      expect(root.querySelector('ul')).toBeFalsy()
      const paras = root.querySelectorAll('p')
      expect(paras.length).toBe(2)
      expect(Array.from(paras).map((p) => p.textContent)).toEqual([
        'Alpha',
        'Beta',
      ])
    })
  })

  describe('applyInlineStyle across block boundaries', () => {
    const selectRange = (
      sn: Node,
      so: number,
      en: Node,
      eo: number
    ) => {
      const selection = window.getSelection()!
      const range = document.createRange()
      range.setStart(sn, so)
      range.setEnd(en, eo)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    it('wraps each block slice separately instead of nesting a block in <strong>', () => {
      root.innerHTML = '<p>Hello</p><p>World</p>'
      const ps = root.querySelectorAll('p')
      selectRange(ps[0].firstChild!, 2, ps[1].firstChild!, 2)

      applyInlineStyle(root, 'strong')

      expect(root.innerHTML).toBe(
        '<p>He<strong>llo</strong></p><p><strong>Wo</strong>rld</p>'
      )
      // No inline element ever wraps a block element (invalid DOM).
      expect(
        root.querySelector('strong p, strong div, strong h1, strong h2')
      ).toBeNull()
      expect(root.textContent).toBe('HelloWorld')
    })

    it('fully wraps a middle block spanned end-to-end', () => {
      root.innerHTML = '<p>aa</p><p>bb</p><p>cc</p>'
      const ps = root.querySelectorAll('p')
      selectRange(ps[0].firstChild!, 1, ps[2].firstChild!, 1)

      applyInlineStyle(root, 'strong')

      expect(root.innerHTML).toBe(
        '<p>a<strong>a</strong></p><p><strong>bb</strong></p><p><strong>c</strong>c</p>'
      )
    })

    it('carries attributes onto every block slice for a link across blocks', () => {
      root.innerHTML = '<p>Hello</p><p>World</p>'
      const ps = root.querySelectorAll('p')
      selectRange(ps[0].firstChild!, 0, ps[1].firstChild!, 5)

      applyInlineStyle(root, 'a', { href: 'https://x.test' })

      const links = root.querySelectorAll('a')
      expect(links.length).toBe(2)
      links.forEach((a) => expect(a.getAttribute('href')).toBe('https://x.test'))
      expect(root.querySelector('a p, a div')).toBeNull()
    })
  })
})
