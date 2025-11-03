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
    console.log('After first apply:', root.innerHTML)

    // Now select the bold text again
    strong = root.querySelector('strong')!
    const range2 = document.createRange()
    range2.selectNodeContents(strong)
    selection.removeAllRanges()
    selection.addRange(range2)

    // Check if bold is active
    const isActive = isInlineStyleActive(root, 'strong')
    expect(isActive).toBe(true)
    console.log('Is bold active before toggle:', isActive)

    // Toggle bold off - should remove <strong>
    applyInlineStyle(root, 'strong')
    
    console.log('After toggle off:', root.innerHTML)
    
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
    console.log('Is bold active after toggle off:', isActive)
    console.log('Current selection:', selection.toString())
    console.log('HTML after toggle:', root.innerHTML)
    
    expect(isActive).toBe(false)
  })
})
