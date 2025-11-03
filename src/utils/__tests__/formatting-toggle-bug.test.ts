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
