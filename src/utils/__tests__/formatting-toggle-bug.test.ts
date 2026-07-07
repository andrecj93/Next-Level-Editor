import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  applyInlineStyle,
  isInlineStyleActive,
} from '../formatting'

describe('Formatting Toggle Bug Reproduction', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  it('should toggle bold on and off completely', () => {
    root.innerHTML = '<p>Hello World</p>'
    const p = root.querySelector('p')!
    
    // Select "Hello"
    const range = document.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    // Apply bold - should wrap in <strong>
    applyInlineStyle(root, 'strong')
    
    let strong = root.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong!.textContent).toBe('Hello')

    // Now select the bold text again
    strong = root.querySelector('strong')!
    const range2 = document.createRange()
    range2.selectNodeContents(strong)
    selection.removeAllRanges()
    selection.addRange(range2)

    // Check if bold is active
    const isActive = isInlineStyleActive(root, 'strong')
    expect(isActive).toBe(true)

    // Toggle bold off - should remove <strong>
    applyInlineStyle(root, 'strong')
    
    // Bold tag should be gone
    strong = root.querySelector('strong')
    expect(strong).toBeFalsy()
    
    // Text should still be there
    expect(root.textContent).toContain('Hello')
  })

  it('should properly detect when bold is NOT active after toggling off', () => {
    root.innerHTML = '<p>Hello World</p>'
    const p = root.querySelector('p')!
    
    // Select "Hello"
    const range = document.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    // Apply bold
    applyInlineStyle(root, 'strong')
    
    // Select the bold text
    const strong = root.querySelector('strong')!
    const range2 = document.createRange()
    range2.selectNodeContents(strong)
    selection.removeAllRanges()
    selection.addRange(range2)

    // Toggle bold off
    applyInlineStyle(root, 'strong')
    
    // Now check if bold is active - it should NOT be
    // The selection should still be on the text "Hello"
    const isActive = isInlineStyleActive(root, 'strong')
    
    expect(isActive).toBe(false)
  })

  it('should toggle italic on and off completely', () => {
    root.innerHTML = '<p>Hello World</p>'
    const p = root.querySelector('p')!
    
    // Select "Hello"
    const range = document.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    // Apply italic
    applyInlineStyle(root, 'em')
    
    let em = root.querySelector('em')
    expect(em).toBeTruthy()
    expect(em!.textContent).toBe('Hello')

    // Select the italic text again
    em = root.querySelector('em')!
    const range2 = document.createRange()
    range2.selectNodeContents(em)
    selection.removeAllRanges()
    selection.addRange(range2)

    // Toggle italic off
    applyInlineStyle(root, 'em')
    
    // Italic tag should be gone
    em = root.querySelector('em')
    expect(em).toBeFalsy()
    
    // Text should still be there
    expect(root.textContent).toContain('Hello')
  })

  it('should toggle underline on and off completely', () => {
    root.innerHTML = '<p>Hello World</p>'
    const p = root.querySelector('p')!
    
    // Select "Hello"
    const range = document.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    // Apply underline
    applyInlineStyle(root, 'u')
    
    let u = root.querySelector('u')
    expect(u).toBeTruthy()
    expect(u!.textContent).toBe('Hello')

    // Select the underlined text again
    u = root.querySelector('u')!
    const range2 = document.createRange()
    range2.selectNodeContents(u)
    selection.removeAllRanges()
    selection.addRange(range2)

    // Toggle underline off
    applyInlineStyle(root, 'u')
    
    // Underline tag should be gone
    u = root.querySelector('u')
    expect(u).toBeFalsy()
    
    // Text should still be there
    expect(root.textContent).toContain('Hello')
  })
})

describe('Toggle-off with text-node-anchored selections (double-click word)', () => {
  // A real double-click selection places BOTH range endpoints inside one text
  // node, so range.commonAncestorContainer is the #text node itself — unlike
  // selectNodeContents(element) used above. isRangeFullyStyled used to root a
  // TreeWalker at that text node, and since a TreeWalker never yields its own
  // root it saw "no styled text" and re-wrapped, nesting <strong><strong>…
  // per click instead of toggling off.
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  const selectInsideTextNode = (textNode: Node) => {
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, textNode.textContent!.length)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    return range
  }

  it.each(['strong', 'em', 'u', 's'])(
    'toggles %s off (not nest) when the selection lives inside one text node',
    (tag) => {
      root.innerHTML = '<p>alpha word omega</p>'
      const p = root.querySelector('p')!

      // Style the middle word first (endpoints inside the paragraph text node)
      const textNode = p.firstChild!
      const applyRange = document.createRange()
      applyRange.setStart(textNode, 6)
      applyRange.setEnd(textNode, 10)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(applyRange)
      applyInlineStyle(root, tag)

      const styled = root.querySelector(tag)
      expect(styled).toBeTruthy()
      expect(styled!.textContent).toBe('word')

      // Re-select like a double-click: endpoints INSIDE the styled text node
      selectInsideTextNode(styled!.firstChild!)
      expect(isInlineStyleActive(root, tag)).toBe(true)

      // Second click must UNWRAP, not nest a duplicate tag
      applyInlineStyle(root, tag)
      expect(root.querySelectorAll(tag).length).toBe(0)
      expect(root.textContent).toContain('word')
    }
  )
})
