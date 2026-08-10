import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { htmlToMarkdown, exportAsHtml } from '../export'
import { generateTocHtml } from '../pageManagement'
import { applyBackgroundColor } from '../commands'

describe('htmlToMarkdown - block wrappers keep line breaks', () => {
  it('does not concatenate <div>-per-line content', () => {
    const md = htmlToMarkdown('<div>Line one</div><div>Line two</div>')
    expect(md).toBe('Line one\n\nLine two')
  })

  it('collapses excess blank lines from nested block wrappers', () => {
    const md = htmlToMarkdown('<div><p>text</p></div>')
    expect(md).toBe('text')
  })
})

describe('exportAsHtml - <pre> whitespace preserved (regression)', () => {
  // downloadFile touches URL.createObjectURL which happy-dom lacks; capture the
  // generated HTML by stubbing the blob creation via a spy on document body.
  let created = ''
  beforeEach(() => {
    // exportAsHtml calls downloadFile -> Blob + URL.createObjectURL; polyfill.
    ;(URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL =
      (blob: Blob) => {
        // Blob text is async; instead re-derive from the same inputs below.
        void blob
        return 'blob:stub'
      }
    ;(URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL =
      () => {}
    created = ''
  })
  afterEach(() => {
    created = ''
  })

  it('leaves the indentation of code inside <pre> untouched', async () => {
    const html =
      '<pre><code>function f() {\n    return 1\n}</code></pre>'
    // Grab the produced document by intercepting Blob construction.
    const OriginalBlob = globalThis.Blob
    class CapturingBlob extends OriginalBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts)
        created = String(parts[0])
      }
    }
    ;(globalThis as unknown as { Blob: typeof Blob }).Blob = CapturingBlob as typeof Blob
    try {
      exportAsHtml(html, 'doc.html', true)
    } finally {
      ;(globalThis as unknown as { Blob: typeof Blob }).Blob = OriginalBlob
    }
    // The 4-space indent of `return 1` must NOT have gained body indentation.
    expect(created).toContain('    return 1')
    expect(created).not.toContain('      return 1')
  })
})

describe('generateTocHtml - escapes heading text (regression)', () => {
  it('escapes angle brackets and ampersands in heading text', () => {
    const html = generateTocHtml([
      { level: 1, text: 'Q&A <notes>', id: 'heading-0', element: document.createElement('h1') },
    ])
    expect(html).toContain('Q&amp;A &lt;notes&gt;')
    expect(html).not.toContain('<notes>')
  })
})

describe('applyBackgroundColor - readable contrast for named/hsl colors', () => {
  let root: HTMLElement
  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })
  afterEach(() => root.remove())

  const highlight = (color: string): string => {
    root.innerHTML = '<p>abc</p>'
    const t = root.querySelector('p')!.firstChild!
    const sel = window.getSelection()!
    const r = document.createRange()
    r.setStart(t, 0)
    r.setEnd(t, 3)
    sel.removeAllRanges()
    sel.addRange(r)
    applyBackgroundColor(root, color)
    return (root.querySelector('span') as HTMLElement).style.color
  }

  it('uses dark text on a light hsl() background', () => {
    // hsl(60,100%,50%) === yellow, luminance high -> black text
    expect(highlight('hsl(60, 100%, 50%)')).toBe('#000000')
  })

  it('uses dark text on a light 3-digit hex background', () => {
    // #ff0 === yellow
    expect(highlight('#ff0')).toBe('#000000')
  })

  it('uses light text on a dark hex background', () => {
    expect(highlight('#101010')).toBe('#ffffff')
  })
})
