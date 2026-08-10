import { describe, it, expect, afterEach } from 'vitest'
import {
  copyFormat,
  pasteFormat,
  clearCopiedFormat,
  hasFormatCopied,
  getCopiedFormat,
} from '../formatPainter'
import { useHtmlSanitizer } from '../../composables/useHtmlSanitizer'

/**
 * Round-14 format-painter rewrite:
 *  - #1: painted bold/italic/underline used to be inline font-weight/font-style/
 *    text-decoration, which the sanitizer strips → lost on save. Now emitted as
 *    real <strong>/<em>/<u> tags that survive.
 *  - #2: pasteFormat used range.toString() + deleteContents, flattening the
 *    target to plain text (links/images/pills/paragraph breaks destroyed). Now
 *    extractContents preserves structure.
 *  - #10: it hard-coded the COMPUTED (inherited theme) color; now only an
 *    EXPLICIT inline color is copied.
 *  - #11: it sampled commonAncestorContainer; now the selection's start element.
 */

const editors: HTMLElement[] = []
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement('div')
  el.contentEditable = 'true'
  el.innerHTML = html
  document.body.appendChild(el)
  editors.push(el)
  return el
}

const selectContents = (node: Node): Selection => {
  const range = document.createRange()
  range.selectNodeContents(node)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  return sel
}

const selectAcross = (
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number
): Selection => {
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  return sel
}

afterEach(() => {
  clearCopiedFormat()
  for (const el of editors.splice(0)) el.remove()
  window.getSelection()?.removeAllRanges()
})

describe('copyFormat', () => {
  it('returns null with no selection', () => {
    window.getSelection()?.removeAllRanges()
    expect(copyFormat(window.getSelection())).toBeNull()
  })

  it('captures bold/italic/underline from real tags', () => {
    const el = mount('<p><strong><em><u>styled</u></em></strong></p>')
    const sel = selectContents(el.querySelector('u')!.firstChild!)
    const fmt = copyFormat(sel)!
    expect(fmt.bold).toBe(true)
    expect(fmt.italic).toBe(true)
    expect(fmt.underline).toBe(true)
  })

  it('captures an EXPLICIT inline color but NOT the inherited theme color', () => {
    const withColor = mount(
      '<p><span style="color: rgb(255, 0, 0)">red</span></p>'
    )
    const fmtColored = copyFormat(
      selectContents(withColor.querySelector('span')!.firstChild!)
    )!
    expect(fmtColored.color).toBe('rgb(255, 0, 0)')

    const plain = mount('<p>plain</p>')
    const fmtPlain = copyFormat(
      selectContents(plain.querySelector('p')!.firstChild!)
    )!
    expect(fmtPlain.color).toBeUndefined()
    expect(fmtPlain.bold).toBe(false)
  })
})

describe('pasteFormat', () => {
  it('returns false when nothing is copied', () => {
    const el = mount('<p>text</p>')
    expect(
      pasteFormat(selectContents(el.querySelector('p')!.firstChild!))
    ).toBe(false)
  })

  it('applies bold as a real <strong> tag, not inline font-weight (#1)', () => {
    const src = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(src.querySelector('strong')!.firstChild!))

    const target = mount('<p>hello</p>')
    const applied = pasteFormat(
      selectContents(target.querySelector('p')!.firstChild!)
    )
    expect(applied).toBe(true)
    expect(target.querySelector('strong')?.textContent).toBe('hello')
    // No inline font-weight anywhere (that is what the sanitizer strips).
    expect(target.innerHTML).not.toMatch(/font-weight/)
  })

  it('preserves a link inside the target selection (#2)', () => {
    const src = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(src.querySelector('strong')!.firstChild!))

    const target = mount('<p>see <a href="https://x.com">docs</a> here</p>')
    selectContents(target.querySelector('p')!)
    expect(pasteFormat(window.getSelection())).toBe(true)

    const link = target.querySelector('a')
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href')).toBe('https://x.com')
    expect(link!.textContent).toBe('docs')
    expect(target.querySelector('strong a')).not.toBeNull()
  })

  it('keeps paragraph breaks when the selection spans blocks (#2)', () => {
    const src = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(src.querySelector('strong')!.firstChild!))

    const target = mount('<p>one</p><p>two</p>')
    const [p1, p2] = Array.from(target.querySelectorAll('p'))
    selectAcross(p1.firstChild!, 0, p2.firstChild!, 3)
    expect(pasteFormat(window.getSelection(), target)).toBe(true)

    // Two paragraphs remain (not merged into one flattened span).
    expect(target.querySelectorAll('p')).toHaveLength(2)
    expect(target.textContent).toBe('onetwo')
    expect(p1.querySelector('strong')?.textContent).toBe('one')
    expect(p2.querySelector('strong')?.textContent).toBe('two')
  })

  it('applies an explicit color as an allowlisted style span', () => {
    const src = mount('<p><span style="color: rgb(0, 128, 0)">g</span></p>')
    copyFormat(selectContents(src.querySelector('span')!.firstChild!))

    const target = mount('<p>hello</p>')
    pasteFormat(selectContents(target.querySelector('p')!.firstChild!))
    expect(target.innerHTML).toMatch(/color:\s*rgb\(0, 128, 0\)/)
  })

  it('painted bold+italic survive the sanitizer round-trip (#1 core)', () => {
    const { sanitizeHtml } = useHtmlSanitizer()
    const src = mount('<p><strong><em>x</em></strong></p>')
    copyFormat(selectContents(src.querySelector('em')!.firstChild!))

    const target = mount('<p>hello</p>')
    pasteFormat(selectContents(target.querySelector('p')!.firstChild!))

    // The whole point of #1: the painted marks are NOT stripped on save.
    const sanitized = sanitizeHtml(target.innerHTML)
    expect(sanitized).toMatch(/<strong/i)
    expect(sanitized).toMatch(/<em/i)
    expect(sanitized).toContain('hello')
  })
})

describe('pasteFormat structural safety (r15 #5/#6/#8)', () => {
  it('a partial cross-block paint does NOT split the boundary blocks (#6)', () => {
    const src = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(src.querySelector('strong')!.firstChild!))

    const target = mount('<p>one two</p><p>three four</p>')
    const [p1, p2] = Array.from(target.querySelectorAll('p'))
    selectAcross(p1.firstChild!, 4, p2.firstChild!, 5)
    pasteFormat(window.getSelection(), target)

    // Still exactly two paragraphs — the halves were never split off.
    expect(target.querySelectorAll('p')).toHaveLength(2)
    expect(p1.textContent).toBe('one two')
    expect(p2.textContent).toBe('three four')
    expect(p1.querySelector('strong')?.textContent).toBe('two')
    expect(p2.querySelector('strong')?.textContent).toBe('three')
  })

  it('painting across table cells keeps the row intact (#5)', () => {
    const src = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(src.querySelector('strong')!.firstChild!))

    const target = mount(
      '<table><tbody><tr><td>alpha</td><td>beta</td></tr></tbody></table>'
    )
    const [td1, td2] = Array.from(target.querySelectorAll('td'))
    selectAcross(td1.firstChild!, 2, td2.firstChild!, 2)
    pasteFormat(window.getSelection(), target)

    const row = target.querySelector('tr')!
    expect(row.querySelectorAll(':scope > td')).toHaveLength(2)
    expect(row.querySelector(':scope > strong')).toBeNull()
    expect(td1.textContent).toBe('alpha')
    expect(td1.querySelector('strong')?.textContent).toBe('pha')
    expect(td2.textContent).toBe('beta')
    expect(td2.querySelector('strong')?.textContent).toBe('be')
  })

  it('a boundary landing on an embed container never deletes the embed (#8)', () => {
    const src = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(src.querySelector('strong')!.firstChild!))

    const target = mount(
      '<p>text</p>' +
        '<div class="embedded-resizable-container" contenteditable="false">' +
        '<iframe src="about:blank"></iframe></div>' +
        '<p>tail</p>'
    )
    const p1 = target.querySelector('p')!
    const embed = target.querySelector('.embedded-resizable-container')!
    const range = document.createRange()
    range.setStart(p1.firstChild!, 0)
    range.setEnd(embed, 0)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    pasteFormat(window.getSelection(), target)

    // The embed (and its iframe) survives the formatting command.
    expect(target.querySelector('.embedded-resizable-container')).not.toBeNull()
    expect(target.querySelector('iframe')).not.toBeNull()
    expect(p1.querySelector('strong')?.textContent).toBe('text')
  })
})

describe('pasteFormat idempotence (r15 #15)', () => {
  it('painting the same selection twice never nests duplicate marks', () => {
    const src = mount('<p><strong><em>b</em></strong></p>')
    copyFormat(selectContents(src.querySelector('em')!.firstChild!))

    const target = mount('<p>hello</p>')
    selectContents(target.querySelector('p')!.firstChild!)
    pasteFormat(window.getSelection(), target)
    // The painter stays armed and re-selects the painted content — a second
    // click used to nest <strong><strong><em><em>… unboundedly.
    pasteFormat(window.getSelection(), target)

    expect(target.querySelectorAll('strong')).toHaveLength(1)
    expect(target.querySelectorAll('em')).toHaveLength(1)
    expect(target.textContent).toBe('hello')
  })
})

describe('clipboard state', () => {
  it('tracks and clears the copied format', () => {
    const el = mount('<p><strong>b</strong></p>')
    copyFormat(selectContents(el.querySelector('strong')!.firstChild!))
    expect(hasFormatCopied()).toBe(true)
    expect(getCopiedFormat()?.bold).toBe(true)
    clearCopiedFormat()
    expect(hasFormatCopied()).toBe(false)
    expect(getCopiedFormat()).toBeNull()
  })
})

describe('copyFormat stops at the editor root (#r16-6)', () => {
  afterEach(() => {
    clearCopiedFormat()
    window.getSelection()?.removeAllRanges()
  })

  const selectContentsOf = (node: Node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    return sel
  }

  it('does not inherit an inline color from ABOVE the editor root', () => {
    const host = document.createElement('div')
    host.style.color = 'red'
    const editor = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = 'plain'
    editor.appendChild(p)
    host.appendChild(editor)
    document.body.appendChild(host)

    const fmt = copyFormat(selectContentsOf(p.firstChild!), editor)!
    expect(fmt.color).toBeUndefined()
    host.remove()
  })

  it('does not report bold from a host-page <b> wrapping the editor', () => {
    const b = document.createElement('b')
    const editor = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = 'plain'
    editor.appendChild(p)
    b.appendChild(editor)
    document.body.appendChild(b)

    const fmt = copyFormat(selectContentsOf(p.firstChild!), editor)!
    expect(fmt.bold).toBe(false)
    b.remove()
  })

  it('still copies marks and explicit color applied INSIDE the editor', () => {
    const editor = document.createElement('div')
    editor.innerHTML =
      '<p><strong><span style="color: rgb(200, 30, 30)">hot</span></strong></p>'
    document.body.appendChild(editor)

    const fmt = copyFormat(
      selectContentsOf(editor.querySelector('span')!.firstChild!),
      editor
    )!
    expect(fmt.bold).toBe(true)
    expect(fmt.color).toBe('rgb(200, 30, 30)')
    editor.remove()
  })
})

describe('copyFormat ignores computed styles inherited from the host page (#r17-painter)', () => {
  afterEach(() => {
    clearCopiedFormat()
    window.getSelection()?.removeAllRanges()
  })

  const selectContentsOf = (node: Node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    return sel
  }

  it('a bold/italic HOST wrapper does not leak into the copied format', () => {
    const host = document.createElement('div')
    host.style.fontWeight = 'bold'
    host.style.fontStyle = 'italic'
    const editor = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = 'plain'
    editor.appendChild(p)
    host.appendChild(editor)
    document.body.appendChild(host)

    const fmt = copyFormat(selectContentsOf(p.firstChild!), editor)!
    expect(fmt.bold).toBe(false)
    expect(fmt.italic).toBe(false)
    host.remove()
  })

  it('an inline font-weight applied INSIDE the editor still copies as bold', () => {
    const editor = document.createElement('div')
    editor.innerHTML =
      '<p><span style="font-weight: bold; font-style: italic">hot</span></p>'
    document.body.appendChild(editor)

    const fmt = copyFormat(
      selectContentsOf(editor.querySelector('span')!.firstChild!),
      editor
    )!
    expect(fmt.bold).toBe(true)
    expect(fmt.italic).toBe(true)
    editor.remove()
  })
})

describe('copyFormat distinguishes genuine document weight from inherited (#r18)', () => {
  afterEach(() => {
    clearCopiedFormat()
    window.getSelection()?.removeAllRanges()
  })

  const mounted: HTMLElement[] = []
  afterEach(() => {
    mounted.splice(0).forEach((el) => el.remove())
  })

  const setup = (hostStyle: string | null, editorHtml: string) => {
    const host = document.createElement('div')
    if (hostStyle) host.setAttribute('style', hostStyle)
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    editor.innerHTML = editorHtml
    host.appendChild(editor)
    document.body.appendChild(host)
    mounted.push(host)
    return editor
  }

  const selectContentsOf = (node: Node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    return sel
  }

  it('copies a heavier explicit weight even when the host is bold (value, not class)', () => {
    const editor = setup(
      'font-weight:600',
      '<p><span style="font-weight:700">hot</span></p>'
    )
    const fmt = copyFormat(
      selectContentsOf(editor.querySelector('span')!.firstChild!),
      editor
    )!
    // 700 is genuinely heavier than the inherited 600 → bold copies.
    expect(fmt.bold).toBe(true)
  })

  it('copies explicit inline italic even when the host is italic', () => {
    const editor = setup(
      'font-style:italic',
      '<p><span style="font-style:italic">q</span></p>'
    )
    const fmt = copyFormat(
      selectContentsOf(editor.querySelector('span')!.firstChild!),
      editor
    )!
    expect(fmt.italic).toBe(true)
  })

  it('still does NOT copy bold from plain text under a bold host (r17 guard preserved)', () => {
    const editor = setup('font-weight:bold', '<p>plain</p>')
    const fmt = copyFormat(
      selectContentsOf(editor.querySelector('p')!.firstChild!),
      editor
    )!
    expect(fmt.bold).toBe(false)
  })

  it('a plain 700 span with NO host still copies bold (no regression)', () => {
    const editor = setup(null, '<p><span style="font-weight:700">x</span></p>')
    const fmt = copyFormat(
      selectContentsOf(editor.querySelector('span')!.firstChild!),
      editor
    )!
    expect(fmt.bold).toBe(true)
  })
})
