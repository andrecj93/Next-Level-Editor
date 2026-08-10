import { describe, it, expect } from 'vitest'
import { htmlToMarkdown, formatHtml } from '../export'

describe('export utility', () => {
  describe('formatHtml', () => {
    it('should format simple paragraph', () => {
      const html = '<p>Hello world</p>'
      const result = formatHtml(html)
      expect(result).toBe('<p>Hello world</p>')
    })

    it('should format nested elements with proper indentation', () => {
      const html = '<div><p>Hello</p><p>World</p></div>'
      const result = formatHtml(html)
      expect(result).toContain('<div>')
      expect(result).toContain('  <p>Hello</p>')
      expect(result).toContain('  <p>World</p>')
      expect(result).toContain('</div>')
    })

    it('should format lists with proper indentation', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = formatHtml(html)
      expect(result).toContain('<ul>')
      expect(result).toContain('  <li>Item 1</li>')
      expect(result).toContain('  <li>Item 2</li>')
      expect(result).toContain('</ul>')
    })

    it('should keep inline elements on same line', () => {
      const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>'
      const result = formatHtml(html)
      expect(result).toBe('<p>This is <strong>bold</strong> and <em>italic</em> text.</p>')
    })

    it('should handle self-closing tags', () => {
      const html = '<div><p>Hello</p><hr><p>World</p></div>'
      const result = formatHtml(html)
      expect(result).toContain('  <hr>')
    })

    it('should preserve element attributes', () => {
      const html = '<a href="https://example.com">Link</a>'
      const result = formatHtml(html)
      expect(result).toContain('href="https://example.com"')
    })

    it('should format deeply nested elements', () => {
      const html = '<div><div><p>Nested</p></div></div>'
      const result = formatHtml(html)
      expect(result).toContain('<div>')
      expect(result).toContain('  <div>')
      expect(result).toContain('    <p>Nested</p>')
      expect(result).toContain('  </div>')
      expect(result).toContain('</div>')
    })

    it('should support custom indent size', () => {
      const html = '<div><p>Test</p></div>'
      const result = formatHtml(html, 4)
      expect(result).toContain('    <p>Test</p>')
    })

    it('should handle headings', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>'
      const result = formatHtml(html)
      expect(result).toContain('<h1>Title</h1>')
      expect(result).toContain('<h2>Subtitle</h2>')
    })

    it('should format images with attributes', () => {
      const html = '<img src="image.jpg" alt="Test image">'
      const result = formatHtml(html)
      expect(result).toContain('<img')
      expect(result).toContain('src="image.jpg"')
      expect(result).toContain('alt="Test image"')
    })

    it('should handle mixed block and inline elements', () => {
      const html = '<div><p>Text with <a href="#">link</a></p><p>Another paragraph</p></div>'
      const result = formatHtml(html)
      expect(result).toContain('<div>')
      expect(result).toContain('  <p>Text with <a href="#">link</a></p>')
      expect(result).toContain('  <p>Another paragraph</p>')
      expect(result).toContain('</div>')
    })

    it('should handle empty elements', () => {
      const html = '<div></div>'
      const result = formatHtml(html)
      expect(result).toBe('<div></div>')
    })

    it('should trim whitespace from text nodes', () => {
      const html = '<p>  Hello   </p>'
      const result = formatHtml(html)
      expect(result).toBe('<p>Hello</p>')
    })
  })

  describe('htmlToMarkdown', () => {
    it('should convert headings', () => {
      expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title')
      expect(htmlToMarkdown('<h2>Subtitle</h2>')).toBe('## Subtitle')
      expect(htmlToMarkdown('<h3>Section</h3>')).toBe('### Section')
    })

    it('should convert paragraphs', () => {
      expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world')
    })

    it('should convert bold text', () => {
      expect(htmlToMarkdown('<strong>bold</strong>')).toBe('**bold**')
      expect(htmlToMarkdown('<b>bold</b>')).toBe('**bold**')
    })

    it('should convert italic text', () => {
      expect(htmlToMarkdown('<em>italic</em>')).toBe('*italic*')
      expect(htmlToMarkdown('<i>italic</i>')).toBe('*italic*')
    })

    it('should convert strikethrough', () => {
      expect(htmlToMarkdown('<s>strike</s>')).toBe('~~strike~~')
    })

    it('should convert code', () => {
      expect(htmlToMarkdown('<code>code</code>')).toBe('`code`')
    })

    it('should convert links', () => {
      expect(htmlToMarkdown('<a href="https://example.com">link</a>'))
        .toBe('[link](https://example.com)')
    })

    it('should convert images', () => {
      expect(htmlToMarkdown('<img src="image.jpg" alt="Alt text" />'))
        .toContain('![Alt text](image.jpg)')
    })

    it('should convert unordered lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('- Item 1')
      expect(result).toContain('- Item 2')
    })

    it('should convert ordered lists', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('1. First')
      expect(result).toContain('2. Second')
    })

    it('should honour <ol start> so continued numbering survives export', () => {
      const html = '<ol start="5"><li>a</li><li>b</li></ol>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('5. a')
      expect(result).toContain('6. b')
    })

    it('should convert blockquotes', () => {
      expect(htmlToMarkdown('<blockquote>Quote</blockquote>'))
        .toContain('> Quote')
    })

    it('should convert horizontal rules', () => {
      expect(htmlToMarkdown('<hr>')).toContain('---')
    })

    it('should handle mixed content', () => {
      const html = '<h1>Title</h1><p>Some <strong>bold</strong> and <em>italic</em> text.</p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('# Title')
      expect(result).toContain('**bold**')
      expect(result).toContain('*italic*')
    })
  })
})
