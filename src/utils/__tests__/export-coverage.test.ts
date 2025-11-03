import { describe, it, expect, vi } from 'vitest'
import { htmlToMarkdown, exportAsHtml, exportAsMarkdown, downloadFile } from '../export'

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

    it('returns empty string for empty input', () => {
      const result = htmlToMarkdown('')
      expect(result).toBe('')
    })

    it('returns empty string for whitespace only', () => {
      const result = htmlToMarkdown('   ')
      expect(result).toBe('')
    })
  })

  describe('downloadFile', () => {
    beforeEach(() => {
      // Mock document methods
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      
      // Mock link click
      const mockClick = vi.fn()
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
            style: {},
          } as any
        }
        return document.createElement(tag)
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('creates and downloads a file', () => {
      downloadFile('test content', 'test.txt', 'text/plain')
      
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(document.body.appendChild).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('exportAsHtml', () => {
    beforeEach(() => {
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      
      const mockClick = vi.fn()
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
            style: {},
          } as any
        }
        return document.createElement(tag)
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('exports HTML with default filename', () => {
      exportAsHtml('<p>Test</p>')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('exports HTML with custom filename', () => {
      exportAsHtml('<p>Test</p>', 'custom.html')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })

  describe('exportAsMarkdown', () => {
    beforeEach(() => {
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      
      const mockClick = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
            style: {},
          } as any
        }
        return originalCreateElement(tag)
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('exports markdown with default filename', () => {
      exportAsMarkdown('<h1>Test</h1>')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('exports markdown with custom filename', () => {
      exportAsMarkdown('<h1>Test</h1>', 'custom.md')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })
})
