import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../export'

describe('Export Coverage Tests', () => {
  describe('htmlToMarkdown', () => {
    it('converts h4 to markdown', () => {
      const html = '<h4>Heading 4</h4>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('#### Heading 4')
    })

    it('converts h5 to markdown', () => {
      const html = '<h5>Heading 5</h5>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('##### Heading 5')
    })

    it('converts h6 to markdown', () => {
      const html = '<h6>Heading 6</h6>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('###### Heading 6')
    })

    it('converts underline with u tag', () => {
      const html = '<p><u>underlined text</u></p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('<u>underlined text</u>')
    })

    it('converts strikethrough to markdown', () => {
      const html = '<p><s>struck text</s></p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('~~struck text~~')
    })

    it('converts inline code', () => {
      const html = '<p>Some <code>inline code</code> here</p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('`inline code`')
    })

    it('converts pre/code blocks', () => {
      const html = '<pre><code>function test() {}</code></pre>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('```')
      expect(result).toContain('function test() {}')
    })

    it('handles images with alt text', () => {
      const html = '<p><img src="test.jpg" alt="Test image"></p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('![Test image](test.jpg)')
    })

    it('handles images without alt text', () => {
      const html = '<p><img src="test.jpg"></p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('![](test.jpg)')
    })

    it('converts blockquotes', () => {
      const html = '<blockquote>This is a quote</blockquote>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('> This is a quote')
    })

    it('converts horizontal rules', () => {
      const html = '<p>Before</p><hr><p>After</p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('---')
    })

    it('handles line breaks', () => {
      const html = '<p>Line 1<br>Line 2</p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('Line 1\nLine 2')
    })
  })
})
