import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyFontSize } from '../commands'

/**
 * Regression coverage for font-size apply-only defects: repeated sizing must
 * restyle in place instead of nesting spans (which compounds em units
 * multiplicatively), and "normal" must CLEAR sizing instead of wrapping a
 * redundant 1em span.
 */
describe('applyFontSize re-size and clear behaviour', () => {
  let root: HTMLElement

  const selectRange = (
    startNode: Node,
    startOffset: number,
    endNode: Node,
    endOffset: number
  ) => {
    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    return range
  }

  const selectContents = (el: Element) => {
    const range = document.createRange()
    range.selectNodeContents(el)
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

  it('re-sizing the same selection updates the existing span instead of nesting', () => {
    root.innerHTML = '<p>Hello World</p>'
    const p = root.querySelector('p')!

    // Select "World" and size it.
    selectRange(p.firstChild!, 6, p.firstChild!, 11)
    applyFontSize(root, 'large')
    expect(root.querySelectorAll('span').length).toBe(1)

    // applyFontSize restored the selection over the new span's contents;
    // re-size immediately, exactly like a user picking another size.
    applyFontSize(root, 'huge')

    const spans = root.querySelectorAll('span')
    expect(spans.length).toBe(1)
    expect(spans[0].style.fontSize).toBe('1.75em')
    expect(spans[0].textContent).toBe('World')
    expect(root.querySelector('span span')).toBeFalsy()
  })

  it('size -> resize -> normal ends with zero font-size spans', () => {
    root.innerHTML = '<p>Hello World</p>'
    const p = root.querySelector('p')!

    selectRange(p.firstChild!, 6, p.firstChild!, 11)
    applyFontSize(root, 'small')
    expect(root.querySelectorAll('span').length).toBe(1)

    applyFontSize(root, 'large')
    expect(root.querySelectorAll('span').length).toBe(1)
    expect(root.querySelector('span')!.style.fontSize).toBe('1.25em')

    applyFontSize(root, 'normal')
    expect(root.querySelectorAll('span').length).toBe(0)
    expect(root.textContent).toBe('Hello World')
  })

  it('collapses pre-existing nested (compounding) sized spans onto one wrapper', () => {
    root.innerHTML =
      '<p><span style="font-size: 1.25em"><span style="font-size: 1.75em">deep</span></span></p>'
    const inner = root.querySelectorAll('span')[1]

    // Select the full text inside the innermost span.
    selectRange(inner.firstChild!, 0, inner.firstChild!, 4)
    applyFontSize(root, 'large')

    const spans = root.querySelectorAll('span')
    expect(spans.length).toBe(1)
    expect(spans[0].style.fontSize).toBe('1.25em')
    expect(spans[0].textContent).toBe('deep')
  })

  it('re-sizing a selection that fully contains an old sized span yields a single span', () => {
    root.innerHTML = '<p><span style="font-size: 1.25em">foo</span> bar</p>'
    const p = root.querySelector('p')!

    selectContents(p)
    applyFontSize(root, 'huge')

    const spans = root.querySelectorAll('span')
    expect(spans.length).toBe(1)
    expect(spans[0].style.fontSize).toBe('1.75em')
    expect(spans[0].textContent).toBe('foo bar')
    expect(root.querySelector('span span')).toBeFalsy()
  })

  it('"normal" clears sizes across a partly-sized selection without wrapping anything', () => {
    root.innerHTML = '<p><span style="font-size: 1.25em">foo</span> bar</p>'
    const p = root.querySelector('p')!

    selectContents(p)
    applyFontSize(root, 'normal')

    expect(root.querySelectorAll('span').length).toBe(0)
    expect(root.textContent).toBe('foo bar')
  })

  it('preserves a span that carries other styling when clearing its font-size', () => {
    root.innerHTML =
      '<p><span style="font-size: 1.25em; color: red">tinted</span></p>'
    const span = root.querySelector('span')!

    selectContents(span)
    applyFontSize(root, 'normal')

    const remaining = root.querySelector('span')!
    expect(remaining).toBeTruthy()
    expect(remaining.style.fontSize).toBe('')
    expect(remaining.style.color).toBe('red')
    expect(remaining.textContent).toBe('tinted')
  })

  it('"normal" at a collapsed caret is a no-op (no 1em span inserted)', () => {
    root.innerHTML = '<p>Hello</p>'
    const p = root.querySelector('p')!

    const range = document.createRange()
    range.setStart(p.firstChild!, 5)
    range.collapse(true)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    applyFontSize(root, 'normal')

    expect(root.querySelector('span')).toBeFalsy()
    expect(root.innerHTML).toBe('<p>Hello</p>')
  })
})
