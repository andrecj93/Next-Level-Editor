import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../export'

describe('export utility', () => {
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
