import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateTableOfContents,
  generateTocHtml,
  hasTableOfContents,
  insertPageBreak,
} from '../pageManagement'

describe('Page Management', () => {
  describe('Table of Contents', () => {
    let editor: HTMLElement

    beforeEach(() => {
      editor = document.createElement('div')
      editor.contentEditable = 'true'
    })

    it('should generate empty TOC for document without headings', () => {
      editor.innerHTML = '<p>Just some text</p>'
      const toc = generateTableOfContents(editor)
      expect(toc).toEqual([])
    })

    it('should generate TOC from headings', () => {
      editor.innerHTML = `
        <h1>First Heading</h1>
        <p>Content</p>
        <h2>Second Heading</h2>
        <p>More content</p>
        <h3>Third Heading</h3>
      `
      const toc = generateTableOfContents(editor)
      expect(toc).toHaveLength(3)
      expect(toc[0].level).toBe(1)
      expect(toc[0].text).toBe('First Heading')
      expect(toc[1].level).toBe(2)
      expect(toc[1].text).toBe('Second Heading')
      expect(toc[2].level).toBe(3)
      expect(toc[2].text).toBe('Third Heading')
    })

    it('should assign IDs to headings without IDs', () => {
      editor.innerHTML = '<h1>Test Heading</h1>'
      const toc = generateTableOfContents(editor)
      expect(toc[0].id).toBeDefined()
      expect(toc[0].id.length).toBeGreaterThan(0)
      const heading = editor.querySelector('h1')
      expect(heading?.id).toBe(toc[0].id)
    })

    it('should preserve existing heading IDs', () => {
      editor.innerHTML = '<h1 id="custom-id">Test Heading</h1>'
      const toc = generateTableOfContents(editor)
      expect(toc[0].id).toBe('custom-id')
    })

    it('should generate HTML for TOC', () => {
      editor.innerHTML = `
        <h1>First</h1>
        <h2>Second</h2>
      `
      const toc = generateTableOfContents(editor)
      const html = generateTocHtml(toc)
      expect(html).toContain('Table of Contents')
      expect(html).toContain('First')
      expect(html).toContain('Second')
      expect(html).toContain('<nav')
      expect(html).toContain('<ul>')
      expect(html).toContain('<a href=')
    })

    it('should generate message for empty TOC', () => {
      const html = generateTocHtml([])
      expect(html).toContain('No headings found')
    })

    it('should check if document has TOC', () => {
      editor.innerHTML = '<p>No TOC</p>'
      expect(hasTableOfContents(editor)).toBe(false)

      editor.innerHTML = '<nav class="table-of-contents"><ul></ul></nav>'
      expect(hasTableOfContents(editor)).toBe(true)
    })

    it('should indent TOC items based on heading level', () => {
      editor.innerHTML = `
        <h1>Level 1</h1>
        <h2>Level 2</h2>
        <h3>Level 3</h3>
      `
      const toc = generateTableOfContents(editor)
      const html = generateTocHtml(toc)
      
      // Check that different indentation levels are applied
      expect(html).toContain('margin-left: 0px')
      expect(html).toContain('margin-left: 20px')
      expect(html).toContain('margin-left: 40px')
    })
  })

  describe('Page Break', () => {
    it('should insert page break with valid selection', () => {
      const editor = document.createElement('div')
      editor.contentEditable = 'true'
      editor.innerHTML = '<p>Test</p>'
      document.body.appendChild(editor)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)

      insertPageBreak(selection)
      
      const pageBreak = editor.querySelector('.page-break')
      expect(pageBreak).toBeTruthy()
      expect(pageBreak?.textContent).toContain('Page Break')

      document.body.removeChild(editor)
    })

    it('should not insert page break without selection', () => {
      const editor = document.createElement('div')
      editor.contentEditable = 'true'
      editor.innerHTML = '<p>Test</p>'

      insertPageBreak(null)
      
      const pageBreak = editor.querySelector('.page-break')
      expect(pageBreak).toBeFalsy()
    })

    it('should add paragraph after page break', () => {
      const editor = document.createElement('div')
      editor.contentEditable = 'true'
      editor.innerHTML = '<p>Test</p>'
      document.body.appendChild(editor)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)

      const initialLength = editor.children.length
      insertPageBreak(selection)
      
      // Should have added page break and a new paragraph
      expect(editor.children.length).toBeGreaterThan(initialLength)

      document.body.removeChild(editor)
    })
  })
})
