import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../export'

describe('htmlToMarkdown code blocks and nested lists', () => {
  describe('code blocks (<pre><code>)', () => {
    it('emits a clean fenced block without backtick-wrapped inner code', () => {
      const html = '<pre><code>const a = 1;</code></pre>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('```\nconst a = 1;\n```')
    })

    it('does not wrap the fenced content in single backticks', () => {
      const html = '<pre><code>line one\nline two</code></pre>'
      const result = htmlToMarkdown(html)
      // The buggy behavior produced ```\n`...`\n``` — assert no stray backtick fence-inside-fence
      expect(result).not.toContain('```\n`')
      expect(result).toContain('line one')
      expect(result).toContain('line two')
      expect(result.startsWith('```')).toBe(true)
      expect(result.endsWith('```')).toBe(true)
    })

    it('preserves the raw text content of the code element', () => {
      const html = '<pre><code>function foo() { return 42; }</code></pre>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('```\nfunction foo() { return 42; }\n```')
    })

    it('still wraps standalone inline code in single backticks', () => {
      expect(htmlToMarkdown('<code>inline</code>')).toBe('`inline`')
    })

    it('falls back to converted children for a <pre> without a single <code>', () => {
      const html = '<pre>plain preformatted text</pre>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('```\nplain preformatted text\n```')
    })
  })

  describe('nested lists', () => {
    it('indents a nested unordered list under its parent item', () => {
      const html = '<ul><li>Item 1<ul><li>Nested</li></ul></li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('- Item 1')
      expect(result).toContain('  - Nested')
    })

    it('renders the parent item text separately from the nested list', () => {
      const html = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>'
      const result = htmlToMarkdown(html)
      const lines = result.split('\n')
      // Parent text must be on its own line, not glued to the nested item.
      expect(lines[0]).toBe('- Parent')
      expect(lines.some(line => line === '  - Child')).toBe(true)
    })

    it('indents a nested ordered list', () => {
      const html = '<ul><li>Item<ol><li>First</li><li>Second</li></ol></li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('- Item')
      expect(result).toContain('  1. First')
      expect(result).toContain('  2. Second')
    })

    it('keeps flat lists unchanged (no extra indentation)', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('- Item 1\n- Item 2')
    })

    it('handles deeply nested lists with increasing indentation', () => {
      const html =
        '<ul><li>A<ul><li>B<ul><li>C</li></ul></li></ul></li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('- A')
      expect(result).toContain('  - B')
      expect(result).toContain('    - C')
    })
  })
})
