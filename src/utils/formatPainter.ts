/**
 * Format Painter Utility
 *
 * Copies the FORMATTING of one selection and applies it to another. Formatting
 * is captured as a set of MARKS (bold/italic/underline/strikethrough + optional
 * explicit color / background / font-size), NOT as an ancestor's computed style,
 * and applied by wrapping the target selection's extracted content in real
 * `<strong>/<em>/<u>/<s>` tags (which survive the sanitizer, unlike inline
 * font-weight/font-style/text-decoration) plus an allowlisted-style span. The
 * target's own structure — links, images, variable pills, paragraph breaks — is
 * preserved (extractContents, not toString()).
 */

import { getBlockSlicesInRange } from './formatting'
import { rangeCapturesContent } from './rangeContact'

const TRANSPARENT = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'rgb(0, 0, 0, 0)'])

export interface CopiedFormat {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  /** Explicit inline color, NOT the inherited theme color (which must not bake in). */
  color?: string
  backgroundColor?: string
  fontSize?: string
}

let copiedFormat: CopiedFormat | null = null

const elementAt = (node: Node): HTMLElement | null =>
  node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement

/**
 * Whether `el` sits inside one of `tags` — but never one ABOVE the editor
 * root: a host page wrapping the editor in <b> is page styling, not document
 * formatting the painter should copy. #r16-6
 */
const hasTag = (el: HTMLElement, tags: string[], root?: HTMLElement): boolean => {
  const hit = el.closest(tags.join(','))
  return hit !== null && (!root || (hit !== root && root.contains(hit)))
}

const fontWeightIsBold = (weight: string): boolean => {
  if (weight === 'bold' || weight === 'bolder') return true
  const numeric = parseInt(weight, 10)
  return Number.isFinite(numeric) && numeric >= 600
}

/** Numeric font-weight for comparison; keyword weights map to their CSS value. */
const numericWeight = (weight: string): number => {
  const map: Record<string, number> = {
    normal: 400,
    bold: 700,
    bolder: 700,
    lighter: 300,
  }
  if (map[weight] != null) return map[weight]
  const numeric = parseInt(weight, 10)
  return Number.isFinite(numeric) ? numeric : 400
}

/**
 * Whether an EXPLICIT inline font-weight/font-style bold/italic is set on the
 * start element or an ancestor within the editor root. This catches a value
 * genuinely applied inside the document even when the host page's inherited
 * weight/style happens to match it (where the computed-value comparison can't
 * tell them apart). #r18
 */
const explicitInlineBold = (el: HTMLElement, root?: HTMLElement): boolean => {
  let current: HTMLElement | null = el
  while (current && (!root || (current !== root && root.contains(current)))) {
    const weight = current.style?.fontWeight
    if (weight && weight.trim() && fontWeightIsBold(weight.trim())) return true
    current = current.parentElement
  }
  return false
}

const explicitInlineItalic = (el: HTMLElement, root?: HTMLElement): boolean => {
  let current: HTMLElement | null = el
  while (current && (!root || (current !== root && root.contains(current)))) {
    const style = current.style?.fontStyle?.trim()
    if (style === 'italic' || style === 'oblique') return true
    current = current.parentElement
  }
  return false
}

/**
 * First EXPLICIT inline value for `prop` walking up ancestors, else undefined —
 * so the painter copies a genuinely-applied color/size, never the inherited
 * theme default (which would bake e.g. dark-theme text color into content).
 * The walk stops at the editor root: inline styles on the root or on the HOST
 * page above it are page chrome, not author formatting. #r16-6
 */
const explicitInlineStyle = (
  el: HTMLElement,
  prop: 'color' | 'backgroundColor' | 'fontSize',
  root?: HTMLElement
): string | undefined => {
  let current: HTMLElement | null = el
  while (current && (!root || (current !== root && root.contains(current)))) {
    const value = current.style?.[prop]
    if (value && value.trim() && !TRANSPARENT.has(value.trim())) {
      return value
    }
    current = current.parentElement
  }
  return undefined
}

/**
 * Copies the formatting from the current selection.
 * @param selection - The browser selection object
 * @param root - The editor root; tag/inline-style detection never walks above
 *   it, so host-page wrappers can't leak into the copied format. #r16-6
 * @returns The copied format or null if no selection
 */
export function copyFormat(
  selection: Selection | null,
  root?: HTMLElement
): CopiedFormat | null {
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  // Sample the ACTUAL formatted text at the selection's start, not the
  // commonAncestorContainer (which for a multi-run selection is a parent whose
  // computed style reflects none of the inner runs).
  const startEl = elementAt(range.startContainer)
  if (!startEl) {
    return null
  }

  const cs = window.getComputedStyle(startEl)
  const decoration = `${cs.textDecorationLine || ''} ${cs.textDecoration || ''}`

  // Computed weight/style is inherited — a HOST page wrapping the editor in a
  // bold/italic container would read as document formatting. Compare by VALUE,
  // not classification: bold copies when the start element is genuinely
  // HEAVIER than what the root inherits (or carries an explicit inline
  // weight), so a 700 span under a 600 host still copies while plain text
  // under a bold host does not. #r17-painter #r18
  const rootCs = root ? window.getComputedStyle(root) : null
  const rootWeight = rootCs ? numericWeight(rootCs.fontWeight) : 400
  const rootIsItalic = rootCs !== null && rootCs.fontStyle === 'italic'

  const format: CopiedFormat = {
    bold:
      hasTag(startEl, ['b', 'strong'], root) ||
      explicitInlineBold(startEl, root) ||
      (fontWeightIsBold(cs.fontWeight) &&
        numericWeight(cs.fontWeight) > rootWeight),
    italic:
      hasTag(startEl, ['i', 'em'], root) ||
      explicitInlineItalic(startEl, root) ||
      (cs.fontStyle === 'italic' && !rootIsItalic),
    underline: hasTag(startEl, ['u'], root) || decoration.includes('underline'),
    strikethrough:
      hasTag(startEl, ['s', 'strike', 'del'], root) ||
      decoration.includes('line-through'),
  }

  const color = explicitInlineStyle(startEl, 'color', root)
  if (color) format.color = color
  const backgroundColor = explicitInlineStyle(startEl, 'backgroundColor', root)
  if (backgroundColor) format.backgroundColor = backgroundColor
  const fontSize = explicitInlineStyle(startEl, 'fontSize', root)
  if (fontSize) format.fontSize = fontSize

  copiedFormat = format
  return format
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'td', 'th', 'pre',
  'ul', 'ol', 'table', 'thead', 'tbody', 'tfoot', 'tr',
])

const hasAnyMark = (fmt: CopiedFormat): boolean =>
  fmt.bold ||
  fmt.italic ||
  fmt.underline ||
  fmt.strikethrough ||
  Boolean(fmt.color || fmt.backgroundColor || fmt.fontSize)

/** The allowlisted-style span for color/background/font-size, or null when none. */
const buildStyleSpan = (fmt: CopiedFormat): HTMLElement | null => {
  const parts: string[] = []
  if (fmt.color) parts.push(`color: ${fmt.color}`)
  if (fmt.backgroundColor) parts.push(`background-color: ${fmt.backgroundColor}`)
  if (fmt.fontSize) parts.push(`font-size: ${fmt.fontSize}`)
  if (parts.length === 0) return null
  const span = document.createElement('span')
  span.setAttribute('style', parts.join('; '))
  return span
}

/**
 * Wrap a set of inline nodes in the copied marks — style span innermost, then
 * `<s>/<u>/<em>/<strong>` — preserving the nodes (and their own structure).
 * Returns the outermost wrapper, or null when there is nothing to wrap.
 */
/** Unwrap every descendant with `tag`, keeping its children (in place). */
const unwrapTagIn = (root: ParentNode, tag: string): void => {
  root.querySelectorAll(tag).forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    el.remove()
  })
}

const wrapInlineNodes = (nodes: Node[], fmt: CopiedFormat): Node | null => {
  if (nodes.length === 0) return null
  const fragment = document.createDocumentFragment()
  nodes.forEach((node) => fragment.appendChild(node))

  // Idempotence: strip the SAME marks we are about to apply from the content
  // first — the painter stays armed and re-selects the painted content, so a
  // second click used to nest <strong><strong><em><em>… unboundedly. #r15-15
  if (fmt.bold) {
    unwrapTagIn(fragment, 'strong')
    unwrapTagIn(fragment, 'b')
  }
  if (fmt.italic) {
    unwrapTagIn(fragment, 'em')
    unwrapTagIn(fragment, 'i')
  }
  if (fmt.underline) unwrapTagIn(fragment, 'u')
  if (fmt.strikethrough) {
    unwrapTagIn(fragment, 's')
    unwrapTagIn(fragment, 'strike')
    unwrapTagIn(fragment, 'del')
  }

  let content: Node = fragment
  const styleSpan = buildStyleSpan(fmt)
  if (styleSpan) {
    // Same idempotence for the style layer: drop spans carrying EXACTLY the
    // style we are about to apply, so repainting doesn't stack them.
    const signature = styleSpan.getAttribute('style')
    fragment.querySelectorAll('span').forEach((span) => {
      if (span.getAttribute('style') === signature) {
        const parent = span.parentNode
        if (!parent) return
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        span.remove()
      }
    })
    styleSpan.appendChild(content)
    content = styleSpan
  }
  const wrap = (tag: string) => {
    const el = document.createElement(tag)
    el.appendChild(content)
    content = el
  }
  if (fmt.strikethrough) wrap('s')
  if (fmt.underline) wrap('u')
  if (fmt.italic) wrap('em')
  if (fmt.bold) wrap('strong')
  return content
}

/**
 * Wrap a fragment's contents in the copied marks: inline runs get the mark
 * tags; block children stay blocks with their INNER content wrapped
 * (recursively, so a list item's nested sublist is handled too).
 */
const wrapFragmentWithMarks = (
  fragment: DocumentFragment,
  fmt: CopiedFormat
): DocumentFragment => {
  const output = document.createDocumentFragment()
  let inlineRun: Node[] = []
  const flush = () => {
    const wrapped = wrapInlineNodes(inlineRun, fmt)
    if (wrapped) output.appendChild(wrapped)
    inlineRun = []
  }

  Array.from(fragment.childNodes).forEach((child) => {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      BLOCK_TAGS.has((child as HTMLElement).tagName.toLowerCase())
    ) {
      flush()
      const block = child as HTMLElement
      const inner = document.createDocumentFragment()
      while (block.firstChild) inner.appendChild(block.firstChild)
      block.appendChild(wrapFragmentWithMarks(inner, fmt))
      output.appendChild(block)
    } else {
      inlineRun.push(child)
    }
  })
  flush()
  return output
}

/**
 * Applies the copied format to the current selection WITHOUT flattening it:
 * inline content is wrapped in mark tags, block elements stay blocks (their
 * inner content is wrapped), so links/images/pills and paragraph breaks
 * survive.
 *
 * With `root`, application is PER-BLOCK (mirroring multi-block linking): each
 * genuinely-touched block gets its clamped slice extracted and re-wrapped IN
 * PLACE. The extraction never crosses a block boundary, so partially-covered
 * paragraphs are never split in two, table cells/rows are never cloned into
 * the row, and no block is ever emptied — eliminating the husk cleanup that
 * could delete embed containers. Callers should always pass the editor root;
 * without it (legacy signature) the raw range is used, which is only safe for
 * selections that don't span blocks.
 * @returns true if a format was applied
 */
export function pasteFormat(
  selection: Selection | null,
  root?: HTMLElement
): boolean {
  if (!copiedFormat || !selection || selection.rangeCount === 0) {
    return false
  }
  const range = selection.getRangeAt(0)
  if (range.collapsed || !hasAnyMark(copiedFormat)) {
    return false
  }

  const fmt = copiedFormat
  const runs: Array<{ first: Node; last: Node }> = []

  const applyToSlice = (slice: Range) => {
    if (slice.collapsed) return
    const fragment = slice.extractContents()
    const wrapped = wrapFragmentWithMarks(fragment, fmt)
    const first = wrapped.firstChild
    const last = wrapped.lastChild
    if (!first || !last) return
    slice.insertNode(wrapped)
    runs.push({ first, last })
  }

  // Per-block slices: leaf blocks plus each dropped ancestor's direct inline
  // runs, all clamped to the range — a parent list item's own text is painted
  // too, never silently skipped. Mutate BACK TO FRONT: slices can share a
  // container (a parent's runs around a sublist), and an earlier extraction
  // would shift the offsets later slices were built on. #r17-1
  const slices = root ? getBlockSlicesInRange(range, root) : []
  if (slices.length === 0) {
    // Pure boundary-touch → no-op; bare inline content (or the legacy no-root
    // call) → the raw range.
    if (!rangeCapturesContent(range)) return false
    applyToSlice(range)
  } else {
    ;[...slices].reverse().forEach(applyToSlice)
  }

  if (runs.length > 0) {
    // Reverse processing order ⇒ the LAST run pushed is the document-first.
    const documentFirst = runs.at(-1)!.first
    const documentLast = runs[0].last
    const newRange = document.createRange()
    newRange.setStartBefore(documentFirst)
    newRange.setEndAfter(documentLast)
    selection.removeAllRanges()
    selection.addRange(newRange)
    return true
  }
  return false
}

/** Clears the copied format. */
export function clearCopiedFormat(): void {
  copiedFormat = null
}

/** Whether a format is currently copied. */
export function hasFormatCopied(): boolean {
  return copiedFormat !== null
}

/** The current copied format, or null. */
export function getCopiedFormat(): CopiedFormat | null {
  return copiedFormat
}
