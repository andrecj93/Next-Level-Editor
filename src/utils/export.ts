/**
 * Export utility functions for converting editor content to different formats.
 *
 * jspdf, html2canvas and html-docx-js-typescript are heavy (they dominate bundle
 * size) and only needed for PDF/Word export, so they are lazy-loaded via dynamic
 * import() inside the functions that use them. This keeps them out of the main
 * library chunk — consumers who never export to PDF/Word never download them.
 */
import { buildTableGrid } from './tableGrid'
import { embedSrcToWatchUrl, getEmbedPlayerChrome } from './embed'

/**
 * Format/pretty-print HTML with proper indentation
 * @param html - HTML content to format
 * @param indentSize - Number of spaces for indentation (default: 2)
 * @returns Formatted HTML string
 */
/**
 * Escape text content for HTML serialization. The DOM has already decoded
 * entities, so literal & < > must be re-encoded when emitting markup.
 */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Escape an attribute value for HTML serialization (also encodes double quotes,
 * since attributes are emitted inside double quotes).
 */
function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replace(/"/g, '&quot;')
}

export function formatHtml(html: string, indentSize: number = 2): string {
  // Pretty-printing needs the DOM. This feeds the code-view's
  // formatted-html-content prop, which a template evaluates during render, so on
  // a server render there is no document — return the content unformatted rather
  // than crash the page; the client re-formats it on hydration.
  if (typeof document === 'undefined') return html
  const temp = document.createElement('div')
  temp.innerHTML = html.trim()

  // Inline elements that should not have line breaks
  const inlineElements = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em',
    'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub',
    'sup', 'time', 'u', 'var'
  ])

  // Self-closing elements
  const selfClosingElements = new Set(['img', 'br', 'hr', 'input', 'meta', 'link'])

  const hasInlineChildren = (element: HTMLElement): boolean => {
    return Array.from(element.childNodes).some(child => {
      if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim()) {
        return true
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childTag = (child as HTMLElement).tagName.toLowerCase()
        return inlineElements.has(childTag)
      }
      return false
    })
  }

  const format = (node: Node, level: number = 0): string => {
    const indent = ' '.repeat(level * indentSize)

    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').trim()
      return escapeHtmlText(text)
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      if (isEditorChrome(element)) return ''
      const tagName = element.tagName.toLowerCase()
      const isInline = inlineElements.has(tagName)
      const isSelfClosing = selfClosingElements.has(tagName)

      // Get attributes
      const attrs = Array.from(element.attributes)
        .map(attr => ` ${attr.name}="${escapeHtmlAttribute(attr.value)}"`)
        .join('')

      // Handle self-closing tags
      if (isSelfClosing) {
        return `${indent}<${tagName}${attrs}>\n`
      }

      // Preformatted content: whitespace is significant. Emit the inner HTML
      // verbatim (no per-line trim, no reindent) so code-block indentation and
      // blank lines survive Code view / HTML export instead of being flattened.
      if (tagName === 'pre') {
        return `${indent}<pre${attrs}>${element.innerHTML}</pre>\n`
      }

      // Handle inline elements. NOT trimmed: whitespace inside an inline tag
      // is rendered, so dropping it deletes a real space — selecting " world"
      // and pressing Ctrl+B gives `Hello<strong> world</strong>!`, which used
      // to format to "Helloworld!". (Block edges below are different: HTML
      // collapses whitespace there, which is what pretty-printing is for.)
      // #R23-3
      // Inside inline content a self-closing child (an <img> icon, a <br>)
      // returns its own trailing newline, which HTML collapses into a rendered
      // SPACE — so `before<img>after` printed as "before after". Strip that
      // formatting newline here; a <br>'s line break comes from the TAG, not
      // the source whitespace, so nothing visible is lost. #R23-51
      const formatInlineChild = (child: Node): string => {
        if (child.nodeType === Node.TEXT_NODE) {
          return escapeHtmlText(child.textContent || '')
        }
        return format(child, 0).replace(/\n$/, '')
      }

      if (isInline) {
        const children = Array.from(element.childNodes)
          .map(formatInlineChild)
          .join('')
        return `<${tagName}${attrs}>${children}</${tagName}>`
      }

      // Check if element has inline content (text or inline elements)
      const hasInline = hasInlineChildren(element)

      if (hasInline) {
        // Format inline content on single line
        const children = Array.from(element.childNodes)
          .map(formatInlineChild)
          .join('')
          .trim()
        return `${indent}<${tagName}${attrs}>${children}</${tagName}>\n`
      }

      // Handle block elements with block children
      const children = Array.from(element.childNodes)
      const formattedChildren = children
        .map(child => format(child, level + 1))
        .filter(child => child.trim().length > 0)
        .join('')

      if (formattedChildren.length === 0) {
        return `${indent}<${tagName}${attrs}></${tagName}>\n`
      }

      return `${indent}<${tagName}${attrs}>\n${formattedChildren}${indent}</${tagName}>\n`
    }

    return ''
  }

  const formatted = Array.from(temp.childNodes)
    .map(child => format(child, 0))
    .join('')

  return formatted.trim()
}

/**
 * Escape the Markdown-significant characters in a plain-text node so ordinary
 * prose (file_name, `key`, 2*3, a~b) does not silently re-render as emphasis,
 * code, or strikethrough when the exported Markdown is viewed. Applied ONLY to
 * text nodes — never to code spans/blocks, whose content must stay literal.
 */
const escapeMarkdownText = (text: string): string =>
  // `<` is escaped too: Markdown treats a bare `<b>` as inline HTML, so a
  // variable VALUE (host-controlled text) containing markup would re-render
  // as live markup in the exported .md instead of reading as literal text. #R24-5
  //
  // `[ ] ( ) !` complete that job. Without them a value of
  // `[Click to verify](https://evil.example/phish)` — the kind of string that
  // arrives from a CRM field or an API, not from the author — exported as a
  // LIVE link whose label lies about its destination, and
  // `![](https://evil.example/pixel.png)` as an auto-loading remote image,
  // i.e. a read receipt on a document the recipient merely opened. #R32-8
  text.replace(/[\\`*_~<[\]()!]/g, '\\$&')

/** The longest run of consecutive backticks anywhere in `text`. */
const longestBacktickRun = (text: string): number =>
  (text.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 0)

/**
 * A fence long enough to survive its own contents. CommonMark closes a fenced
 * block on the first line of AT LEAST as many backticks, so a block containing
 * ``` needs four or more — otherwise the author's own code sample terminates
 * the fence and everything after it becomes live Markdown. #R32-9
 */
const codeFenceFor = (code: string): string =>
  '`'.repeat(Math.max(3, longestBacktickRun(code) + 1))

/**
 * An inline code span whose delimiter is longer than any backtick run inside
 * it, with the space padding CommonMark requires when the content itself
 * begins or ends with a backtick. `<code>a\`b</code>` used to emit `` `a`b` ``,
 * which renders as a broken span plus stray literal text. #R32-9
 */
const inlineCodeSpan = (code: string): string => {
  const fence = '`'.repeat(longestBacktickRun(code) + 1)
  const pad = code.startsWith('`') || code.endsWith('`') ? ' ' : ''
  return `${fence}${pad}${code}${pad}${fence}`
}

/**
 * Escape a leading BLOCK construct so plain prose does not re-render as a list,
 * heading, or quote. A paragraph "1. This is not a list" would otherwise parse
 * back as an ordered list; same for "- ", "+ ", "# ", "> ". Applied only to the
 * rendered inline text of paragraph-like blocks (not headings, which own their
 * "# " prefix). A bare "**bold**" is untouched — the markers below all require a
 * trailing space (or a digit + delimiter), which bold/emphasis never have.
 */
const escapeLeadingBlockConstruct = (text: string): string =>
  text
    .replace(/^(\s*)(#{1,6})(\s)/, '$1\\$2$3')
    .replace(/^(\s*)([>+\-*])(\s)/, '$1\\$2$3')
    .replace(/^(\s*\d+)([.)])(\s)/, '$1\\$2$3')

const MD_BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'hr',
])

/**
 * The LITERAL text of a preformatted block: raw characters (never markdown-
 * escaped, so a fenced block keeps `a_b` and `c * d` verbatim) while <br> and
 * block children still contribute their line breaks. Plain textContent would
 * drop those breaks, collapsing a <br>-separated snippet — the shape
 * Confluence/Jira/Word paste — into one unusable line. #r20 MD-PRE #r21-4
 */
const preformattedText = (element: HTMLElement): string => {
  let out = ''
  // A block child both OPENS a line and CLOSES it. The close is paid lazily —
  // only once something follows — so a block ending the <pre> leaves no
  // trailing newline. Opening alone was not enough: text after the last block
  // (typing at the end of a <div>-per-line paste) was glued onto it. #r22-3
  let pendingBlockBreak = false
  const lineOpen = (): boolean => out !== '' && !out.endsWith('\n')
  const payBlockBreak = (): void => {
    if (!pendingBlockBreak) return
    pendingBlockBreak = false
    if (lineOpen()) out += '\n'
  }
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!text) return
      payBlockBreak()
      out += text
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = (node as HTMLElement).tagName.toLowerCase()
    if (tag === 'br') {
      // <br> is CONTENT: it renders its own break on top of any owed one, which
      // is why <div>a</div><br>b really does render a blank line between them.
      payBlockBreak()
      out += '\n'
      return
    }
    if (MD_BLOCK_TAGS.has(tag)) {
      payBlockBreak()
      // Never a leading blank line, and a <br> just before satisfies the open.
      if (lineOpen()) out += '\n'
      Array.from(node.childNodes).forEach(walk)
      pendingBlockBreak = true
      return
    }
    Array.from(node.childNodes).forEach(walk)
  }
  Array.from(element.childNodes).forEach(walk)
  return out
}

/**
 * Whether a block's first meaningful child is INLINE (text or an inline
 * element). Only then does the block's rendered content START with its OWN
 * text — so a leading construct came from the author and should be escaped.
 * When the first child is itself a block (a wrapper <div> around an <h2>, the
 * document temp root), the leading "# "/"- " belongs to that child's rendering
 * and must NOT be re-escaped.
 */
const startsWithOwnText = (element: HTMLElement): boolean => {
  const first = Array.from(element.childNodes).find(
    node =>
      node.nodeType !== Node.TEXT_NODE || (node.textContent || '').length > 0
  )
  if (!first) return false
  if (first.nodeType === Node.TEXT_NODE) return true
  return !MD_BLOCK_TAGS.has((first as HTMLElement).tagName.toLowerCase())
}

/**
 * The page-break widget's on-screen label is editor CHROME, not document text.
 * Serializing it turned "Chapter one. / [page break] / Chapter two." into
 * "Chapter one.

Page Break---

Chapter two." — the words became body
 * text in every export. The PDF path already strips it (stripPageBreakChrome)
 * because html2canvas rasterizes the live DOM; the text-serializing exports
 * never did. The break's own <hr> is kept, so the separator survives. #R23-37
 */
const isEditorChrome = (element: HTMLElement): boolean =>
  element.classList.contains('page-break-label')

/**
 * Convert HTML to Markdown
 * @param html - HTML content to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html

  const convert = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeMarkdownText(node.textContent || '')
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      if (isEditorChrome(element)) return ''
      const tagName = element.tagName.toLowerCase()
      const children = Array.from(element.childNodes).map(convert).join('')

      switch (tagName) {
        case 'h1':
          return `# ${children}\n\n`
        case 'h2':
          return `## ${children}\n\n`
        case 'h3':
          return `### ${children}\n\n`
        case 'h4':
          return `#### ${children}\n\n`
        case 'h5':
          return `##### ${children}\n\n`
        case 'h6':
          return `###### ${children}\n\n`
        // contenteditable/execCommand commonly emits one <div> per visual line;
        // treat these block wrappers like paragraphs so their line breaks
        // survive instead of the lines being concatenated.
        case 'p':
        case 'div':
        case 'section':
        case 'article':
        case 'header':
        case 'footer':
        case 'main':
        case 'aside':
          // Escape a leading list/heading/quote marker so plain prose that
          // happens to start with one does not re-render as that construct —
          // but only when this block's own text leads (not a child block whose
          // rendered marker would be wrongly escaped).
          return `${
            startsWithOwnText(element)
              ? escapeLeadingBlockConstruct(children)
              : children
          }\n\n`
        case 'strong':
        case 'b':
          return `**${children}**`
        case 'em':
        case 'i':
          return `*${children}*`
        case 'u':
          return `<u>${children}</u>`
        case 's':
          return `~~${children}~~`
        case 'code':
          // Inline code is literal: use the raw text so escaping or formatting
          // of child text nodes never corrupts the code span.
          return inlineCodeSpan(element.textContent || '')
        case 'pre': {
          // If the <pre> wraps a single <code>, emit a clean fenced block using
          // the raw text content, avoiding the backtick-wrapped inner conversion.
          const codeChildren = Array.from(element.children).filter(
            child => child.tagName.toLowerCase() === 'code'
          )
          // A fenced block renders its content VERBATIM, so take the raw text
          // for a bare <pre> too — the escaping child conversion injected stray
          // backslashes (const a\_b = c \* d). preformattedText keeps it
          // literal while still honouring <br>/block line breaks, which plain
          // textContent would drop. #r20 MD-PRE #r21-4
          const code = preformattedText(element)
          // Preserve the syntax language from `class="language-xxx"` on the inner
          // <code> so highlighting survives re-import.
          let language = ''
          if (codeChildren.length === 1) {
            const match = codeChildren[0].className.match(/language-([\w-]+)/)
            if (match) language = match[1]
          }
          // The fence must be LONGER than the longest backtick run inside the
          // block (CommonMark). Hard-coding three let a user close the fence
          // from INSIDE their own code sample — everything after it then
          // parsed as attacker-authored Markdown, including raw HTML that runs
          // in VS Code's preview, `marked`, or markdown-it with html:true.
          // This is the same threat #R24-5 fixed for `<`; the <pre> path
          // bypassed the text escaper entirely. #R32-9
          return `${codeFenceFor(code)}${language}\n${code}\n${codeFenceFor(code)}\n\n`
        }
        case 'blockquote': {
          // Prefix EVERY line, not just the first: a multi-paragraph quote
          // (or one containing a list/heading/<br>) otherwise leaves every line
          // after the first outside the quote on render.
          const quoted = children
            .replace(/\n+$/, '')
            .split('\n')
            .map(line => (line ? `> ${line}` : '>'))
            .join('\n')
          return `${quoted}\n\n`
        }
        case 'a': {
          const href = element.getAttribute('href') || ''
          // A destination with spaces or parens is not a valid bare Markdown
          // link target; CommonMark permits an angle-bracketed destination.
          const dest = /[ ()]/.test(href) ? `<${href}>` : href
          // A link label is inline: collapse the blank lines a nested block or
          // image child emits, which would otherwise terminate the [label]
          // before its (destination).
          const label = children.replace(/\s*\n\s*/g, ' ').trim()
          return `[${label}](${dest})`
        }
        case 'img': {
          const src = element.getAttribute('src') || ''
          const alt = element.getAttribute('alt') || ''
          // Same destination rule as <a>: a src with spaces or parens must be
          // angle-bracketed or the space breaks the Markdown destination.
          const dest = /[ ()]/.test(src) ? `<${src}>` : src
          // Images are INLINE (like <a>): a forced "\n\n" here tore an inline
          // image — and the text after it — out of its paragraph / list item.
          // The enclosing block supplies its own block spacing.
          return `![${alt}](${dest})`
        }
        case 'ul':
          return `${children}\n`
        case 'ol':
          return `${children}\n`
        case 'li': {
          // Render the li's own inline content separately from any nested lists
          // so nested <ul>/<ol> can be indented instead of glued onto the item.
          let ownContent = ''
          let nestedContent = ''
          Array.from(element.childNodes).forEach(child => {
            const childTag =
              child.nodeType === Node.ELEMENT_NODE
                ? (child as HTMLElement).tagName.toLowerCase()
                : ''
            if (childTag === 'ul' || childTag === 'ol') {
              nestedContent += convert(child)
            } else {
              ownContent += convert(child)
            }
          })

          // Indent each line of nested-list output by two spaces.
          const indentedNested = nestedContent
            .split('\n')
            .map(line => (line ? `  ${line}` : line))
            .join('\n')

          const parent = element.parentElement
          let marker = '- '
          if (parent?.tagName.toLowerCase() === 'ol') {
            // Honour <ol start="N"> so continued numbering survives export
            // (start defaults to 1, reproducing the old index+1 behaviour).
            const parsedStart = parseInt(parent.getAttribute('start') || '1', 10)
            const start = Number.isFinite(parsedStart) ? parsedStart : 1
            marker = `${start + Array.from(parent.children).indexOf(element)}. `
          } else if (element.getAttribute('data-checked') !== null) {
            // Checklist item -> GFM task-list marker so the checked state
            // survives round-tripping back into any Markdown renderer.
            marker =
              element.getAttribute('data-checked') === 'true' ? '- [x] ' : '- [ ] '
          }
          return `${marker}${ownContent}\n${indentedNested}`
        }
        case 'hr':
          return '---\n\n'
        case 'br':
          return '\n'
        case 'table': {
          // Render from the colspan/rowspan-aware virtual grid (tableGrid.ts):
          // GFM has no cell spans, so a spanning cell must EXPAND into
          // placeholder cells — its text at the top-left (origin) slot, empties
          // at every other slot — or all later cells shift into wrong columns.
          // The grid walks table.rows, covering thead/tbody/tfoot in order.
          const grid = buildTableGrid(element as HTMLTableElement)
          if (grid.length === 0) {
            return ''
          }

          // Render a cell's content inline: convert children, escape pipes so
          // they don't break the GFM table, and collapse newlines to spaces.
          const cellText = (cell: Element): string =>
            Array.from(cell.childNodes)
              .map(convert)
              .join('')
              .replace(/\|/g, '\\|')
              .replace(/\s*\n\s*/g, ' ')
              .trim()

          const rowToLine = (slots: (typeof grid)[number]): string =>
            `| ${slots
              .map(slot => (slot.origin ? cellText(slot.cell) : ''))
              .join(' | ')} |`

          // GFM requires a separator after the header row. Treat the first row
          // as the header (a first row of <th> or a <thead> row lands there);
          // even without one, synthesizing the separator after the first row
          // keeps the output rendering as a table.
          const columnCount = Math.max(...grid.map(row => row.length), 1)
          const separator = `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`

          const lines = grid.map(rowToLine)
          lines.splice(1, 0, separator)
          return `${lines.join('\n')}\n\n`
        }
        case 'thead':
        case 'tbody':
        case 'tfoot':
        case 'tr':
        case 'th':
        case 'td':
          // Rows/cells are rendered by the parent `table` case above; orphaned
          // ones outside a table just pass their content through.
          return children
        case 'iframe':
        case 'video': {
          // Embeds have no Markdown equivalent — emit a link so they survive
          // export instead of vanishing.
          let src = element.getAttribute('src') || ''
          if (!src && tagName === 'video') {
            const source = element.querySelector('source')
            src = source?.getAttribute('src') || ''
          }
          return src ? `[Embedded video](${src})\n\n` : ''
        }
        default:
          return children
      }
    }

    return ''
  }

  // Collapse the runs of blank lines that nested block wrappers can produce.
  return convert(temp).replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Download content as a file
 * @param content - Content to download (string or Blob)
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file (only used when content is a string)
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  let blob: Blob
  if (content instanceof Blob) {
    blob = content
  } else {
    blob = new Blob([content], { type: mimeType })
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Export HTML content
 * @param html - HTML content to export
 * @param filename - Filename for export
 * @param prettify - Whether to format the HTML with indentation (default: true)
 */
/**
 * Replace every variable pill with the value it resolves to, so an EXPORT
 * produces the same finished document printing does.
 *
 * The feature exists to template a document, and printing already substitutes
 * (the print CSS swaps in attr(data-value)) — but exports did not: PDF
 * rasterized the live pill, and Word/HTML/Markdown serialized its text node, so
 * the same intent gave `{{ user.name }}` or "Jane Smith" depending on which
 * button was pressed. The pill's chrome goes too; its classes mean nothing
 * outside the editor. A pill with no resolved value keeps its literal token — an
 * unresolved variable is more useful than a silent gap. #R23-64
 *
 * Parsed in an INERT document: this HTML can come from the host, and a live
 * parse would start loading its <img>s. Same reasoning as wordPaste. #R23-8
 */
export function substituteVariableValues(html: string): string {
  if (typeof document === 'undefined' || !html.includes('editor-variable')) {
    return html
  }
  const inert = document.implementation.createHTMLDocument('')
  const holder = inert.createElement('div')
  holder.innerHTML = html
  holder.querySelectorAll<HTMLElement>('.editor-variable').forEach((pill) => {
    const value = pill.dataset.value
    const text = value && value.length > 0 ? value : (pill.textContent ?? '')
    pill.replaceWith(inert.createTextNode(text))
  })
  return holder.innerHTML
}

/**
 * Remove the page-break WIDGET's chrome from an HTML string and replace it
 * with the real thing. The on-screen widget is a labelled band ("Page Break" +
 * a rule); #R23-37 taught the two serializers (formatHtml, htmlToMarkdown) to
 * drop the label, but exports that embed the raw HTML directly — Word, and
 * exportAsHtml with prettify=false — shipped the label as literal document
 * text. Here the label and rule are removed and the band itself becomes an
 * empty block carrying `page-break-after`, which IS a page break to Word and
 * to any browser printing the exported file. Inert parse: host HTML. #R24-2
 */
export function stripPageBreakChromeFromHtml(html: string): string {
  if (typeof document === 'undefined' || !html.includes('page-break')) {
    return html
  }
  const inert = document.implementation.createHTMLDocument('')
  const holder = inert.createElement('div')
  holder.innerHTML = html
  holder.querySelectorAll('.page-break-label, .page-break-line').forEach((el) => el.remove())
  holder.querySelectorAll<HTMLElement>('.page-break').forEach((band) => {
    band.setAttribute(
      'style',
      'page-break-after: always; height: 0; min-height: 0; margin: 0; padding: 0; border: none; background: none;'
    )
  })
  return holder.innerHTML
}

/**
 * Remove the embed container's EDITOR chrome from an export tree, in place.
 * The container's whole look is a persisted inline style: a dashed affordance
 * border, an 8px radius, `cursor: pointer` and a hover `transition` — plus
 * `contenteditable`/`tabindex` and, while an embed is SELECTED, a solid
 * border and four corner resize handles. All of it is editing UI; none of it
 * is document content. Layout (size, margin, position/overflow — the player
 * inside is absolutely positioned) and identity (class + data-*, so an
 * exported file re-imported into the editor round-trips back into a live
 * embed) are kept. Mirrors stripPageBreakChrome. #R28-1
 */
export function stripEmbedChrome(container: HTMLElement): void {
  container.querySelectorAll('.embed-resize-handle').forEach((el) => el.remove())
  container
    .querySelectorAll<HTMLElement>('.embedded-resizable-container')
    .forEach((box) => {
      // Clearing the shorthand also clears a selection's solid style/color.
      // A FILE attachment is the exception: it is a CARD, and with no border
      // at all its fixed box exported as a floating paperclip in blank space
      // — it keeps a neutral print-safe boundary instead of the editor's
      // accent chrome. #R29-2
      box.style.border =
        box.getAttribute('data-type') === 'file' ? '1px solid #ccc' : ''
      box.style.borderRadius = ''
      box.style.transition = ''
      box.style.cursor = ''
      box.removeAttribute('contenteditable')
      box.removeAttribute('tabindex')
    })
}

/**
 * Degrade video-embed containers to a visible watch link, in place, for the
 * exports that CANNOT render a live player: html2canvas only rasterizes an
 * iframe whose contentWindow.document it can reach — a cross-origin
 * YouTube/Vimeo player forbids that, so the PDF drew an empty box — and
 * Word's HTML import has no browsing context for iframes, so the video simply
 * vanished from the .docx. A compact paragraph with the CANONICAL watch URL
 * (visible as text too: a rasterized link is not clickable, the reader must
 * be able to read it) replaces the whole container. Containers with no usable
 * player are dropped — a static document should not carry an empty box.
 * exportAsHtml keeps the live player; a browser renders it fine. #R29-1
 */
export function degradeVideoEmbeds(container: HTMLElement): void {
  /** A paragraph holding a visible, clickable link to the video. */
  const linkParagraph = (doc: Document, label: string, url: string) => {
    const paragraph = doc.createElement('p')
    const link = doc.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
    link.textContent = `▶ ${label} — ${url}`
    paragraph.appendChild(link)
    return paragraph
  }

  container
    .querySelectorAll<HTMLElement>(
      '.embedded-resizable-container[data-type="embed"]'
    )
    .forEach((box) => {
      const src =
        box.querySelector('iframe')?.getAttribute('src')?.trim() ?? ''
      const watchUrl = embedSrcToWatchUrl(src)
      if (!watchUrl && !src) {
        box.remove()
        return
      }
      // "YouTube video player" / "Vimeo video player" -> "YouTube video" —
      // but only when the src really IS that host; an unrecognized player
      // (live-DOM PDF path, plugin-inserted) gets the generic label instead
      // of a lie. #R30-2
      const label = watchUrl
        ? getEmbedPlayerChrome(src).title.replace(/ player$/i, '')
        : 'Embedded video'
      box.replaceWith(
        linkParagraph(box.ownerDocument, label, watchUrl ?? src)
      )
    })

  // Uploaded video FILES are equally unrenderable in Word/PDF: Word's HTML
  // import has no <video> support and html2canvas cannot paint an unloaded
  // clone — the upload exported as invisible blank space. A real URL becomes
  // a link like the embeds above; a data: payload cannot usefully be linked,
  // so the reader gets an explicit placeholder instead of silent loss. #R30-1
  container
    .querySelectorAll<HTMLElement>(
      '.embedded-resizable-container[data-type="video"]'
    )
    .forEach((box) => {
      const doc = box.ownerDocument
      const src =
        box.querySelector('video')?.getAttribute('src')?.trim() ?? ''
      if (/^https?:\/\//i.test(src)) {
        box.replaceWith(linkParagraph(doc, 'Video', src))
        return
      }
      const paragraph = doc.createElement('p')
      const note = doc.createElement('em')
      note.textContent = 'Video attachment (not playable in this format)'
      paragraph.appendChild(note)
      box.replaceWith(paragraph)
    })
}

/**
 * String-input variant of degradeVideoEmbeds (the Word path transforms the
 * persisted HTML directly). Inert parse: host HTML must not start loading the
 * players. #R29-1
 */
export function degradeVideoEmbedsFromHtml(html: string): string {
  if (
    typeof document === 'undefined' ||
    !html.includes('embedded-resizable-container')
  ) {
    return html
  }
  const inert = document.implementation.createHTMLDocument('')
  const holder = inert.createElement('div')
  holder.innerHTML = html
  degradeVideoEmbeds(holder)
  return holder.innerHTML
}

/**
 * String-input variant of stripEmbedChrome for the exports that transform the
 * persisted HTML directly (Word, exportAsHtml). Inert parse: host HTML must
 * not start loading the players. #R28-1
 */
export function stripEmbedChromeFromHtml(html: string): string {
  if (
    typeof document === 'undefined' ||
    !html.includes('embedded-resizable-container')
  ) {
    return html
  }
  const inert = document.implementation.createHTMLDocument('')
  const holder = inert.createElement('div')
  holder.innerHTML = html
  stripEmbedChrome(holder)
  return holder.innerHTML
}

export function exportAsHtml(html: string, filename: string = 'document.html', prettify: boolean = true) {
  const BODY_INDENT = '  ' // 2 spaces to match formatHtml default
  // Variables become their values: an export is a finished document. #R23-64
  // Widget chrome goes too — the label must never be body text. #R24-2
  // And the embed container's editor chrome (dashed affordance border,
  // focusability) is editing UI, not document content. #R28-1
  const resolved = stripEmbedChromeFromHtml(
    stripPageBreakChromeFromHtml(substituteVariableValues(html))
  )
  const bodyContent = prettify ? formatHtml(resolved) : resolved
  // Whitespace inside <pre> is significant, so never indent its continuation
  // lines — only the opening <pre> tag line itself gets the body indent.
  let insidePre = false
  const formattedBody = prettify
    ? bodyContent
        .split('\n')
        .map(line => {
          const out = line && !insidePre ? `${BODY_INDENT}${line}` : line
          const opensPre = /<pre[\s>]/.test(line)
          const closesPre = /<\/pre>/.test(line)
          if (opensPre && !closesPre) insidePre = true
          else if (closesPre) insidePre = false
          return out
        })
        .join('\n')
    : bodyContent
  
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Document</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
      padding-left: 16px;
      color: #666;
    }
    /* Checklist: the editor draws the checkbox with CSS (no live <input>), so
       the exported document must carry the same rules or a checklist renders as
       a plain bullet list and the checked/unchecked state is lost. */
    ul.checklist {
      list-style: none;
      padding-left: 0;
    }
    ul.checklist li {
      position: relative;
      padding-left: 1.75em;
    }
    ul.checklist li::before {
      content: "\\2610"; /* ☐ */
      position: absolute;
      left: 0;
    }
    ul.checklist li[data-checked="true"]::before {
      content: "\\2611"; /* ☑ */
    }
    ul.checklist li[data-checked="true"] {
      text-decoration: line-through;
      color: #888;
    }
  </style>
</head>
<body>
${formattedBody}
</body>
</html>`
  downloadFile(fullHtml, filename, 'text/html')
}

/**
 * Export as Markdown
 * @param html - HTML content to convert and export
 * @param filename - Filename for export
 */
export function exportAsMarkdown(html: string, filename: string = 'document.md') {
  const markdown = htmlToMarkdown(substituteVariableValues(html))
  downloadFile(markdown, filename, 'text/markdown')
}

/**
 * Export as PDF
 * @param element - HTML element to export
 * @param filename - Filename for export
 */
/**
 * Remove the on-screen page-break WIDGET chrome from an export clone. html2canvas
 * (used by the PDF path) rasterizes the live DOM and does NOT honor @media print,
 * so the "PAGE BREAK" label and its dashed band would otherwise print into the
 * PDF as literal editor chrome. The zero-height markers remain available to
 * the PDF page planner so explicit page breaks are honored.
 */
export function stripPageBreakChrome(container: HTMLElement): void {
  container
    .querySelectorAll('.page-break-label, .page-break-line')
    .forEach((label) => label.remove())
  container
    .querySelectorAll<HTMLElement>('.page-break')
    .forEach((band) => {
      band.style.border = 'none'
      band.style.background = 'none'
      band.style.height = '0'
      // min-height too: the stylesheet pins `.editor-content .page-break
      // { min-height: 60px }`, and an inline style only wins for the properties
      // it actually sets — so zeroing height alone still left a 60px blank band
      // on the page. Measured in chromium: 96px rendered -> 60px after the old
      // strip -> 0px with this line. Mirrors the @media print rule, which is the
      // authoritative statement of intent for paper. #R23-50
      band.style.minHeight = '0'
      band.style.margin = '0'
      band.style.padding = '0'
    })
}

/**
 * Copy every CSS custom property the editor defines onto `clone`, so the
 * detached PDF export container resolves `var(--…)` the same way the live
 * editor does. The vars live ONLY on `.next-level-editor` (none on :root), and
 * the export clone is appended to <body> outside that scope — so
 * `.editor-content table td { border: 1px solid var(--editor-border) }` and the
 * blockquote's `var(--toolbar-accent)` bar became invalid-at-computed-value and
 * fell back to `none`: tables lost every gridline, blockquotes their accent
 * bar. Copying the RESOLVED values also carries the active theme/preset.
 * Adding the `.next-level-editor` CLASS instead would drag in its
 * `display:flex; height:100%` chrome and distort the PDF. #R23-18
 */
export function copyEditorVariables(
  clone: HTMLElement,
  source: Element | null
): void {
  if (!source || typeof getComputedStyle !== 'function') return
  const cs = getComputedStyle(source)
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i]
    if (prop.startsWith('--')) {
      clone.style.setProperty(prop, cs.getPropertyValue(prop))
    }
  }
}

export interface PdfExportOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

/** Let the browser paint progress and handle input between rendered pages.
 * A fixed 32 ms pause is not two frames on a busy or low-refresh browser.
 * The fallback also allows exports to continue in a background tab. */
function yieldPdfRendering(): Promise<void> {
  return new Promise(resolve => {
    let frame = 0;
    const finish = () => {
      clearTimeout(fallback);
      if (frame) window.cancelAnimationFrame(frame);
      resolve();
    };
    const fallback = setTimeout(finish, 250);
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(finish);
    });
  });
}

export async function exportAsPdf(element: HTMLElement, filename: string = 'document.pdf', options: PdfExportOptions = {}) {
  let completed = 0;
  const checkCancelled = () => {
    if (options.signal?.aborted) throw new DOMException('PDF export cancelled', 'AbortError');
  };
  try {
    checkCancelled();
    console.debug('[NextLevelEditor] PDF export started');
    // Create a temporary container with the content.
    const tempDiv = document.createElement('div')
    tempDiv.setAttribute('aria-hidden', 'true');
    tempDiv.inert = true;
    // Carry the `.editor-content` class so every editor style SCOPED to it
    // still matches in the clone — most visibly the checklist checkboxes and
    // their checked/strikethrough state, which are drawn entirely by
    // `.editor-content ul.checklist li::before`. Without the class the PDF
    // rasterized a plain bulleted list and the done/not-done state was lost.
    tempDiv.className = 'editor-content nle-pdf-snapshot'
    tempDiv.style.position = 'fixed'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    tempDiv.style.width = '800px'
    tempDiv.style.maxWidth = 'none'
    tempDiv.style.minHeight = '0'
    tempDiv.style.height = 'auto'
    tempDiv.style.maxHeight = 'none'
    tempDiv.style.overflow = 'visible'
    tempDiv.style.boxSizing = 'border-box'
    tempDiv.style.margin = '0'
    tempDiv.style.padding = '20px'
    tempDiv.style.backgroundColor = 'white'
    tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    // The clone lives outside `.next-level-editor`, where the editor's CSS vars
    // are defined — carry them over or table gridlines and the blockquote bar
    // render as `none`. #R23-18
    copyEditorVariables(
      tempDiv,
      element.closest?.('.next-level-editor') ??
        document.querySelector('.next-level-editor')
    )
    const sourceStyle = getComputedStyle(element);
    for (const property of ['font-family', 'font-size', 'line-height', 'letter-spacing', 'direction']) {
      const value = sourceStyle.getPropertyValue(property);
      if (value) tempDiv.style.setProperty(property, value);
    }
    // The saved file is paper, including when the writing surface is dark.
    const paperColors: Record<string, string> = {
      '--text-color': '#20242a', '--text-secondary': '#4b5563',
      '--background-color': '#ffffff', '--background-alt': '#f5f5f5',
      '--editor-bg': '#ffffff', '--editor-border': '#cbd0d6', '--border-color': '#cbd0d6',
      '--color-surface': '#ffffff', '--color-border': '#cbd0d6', '--color-text-secondary': '#4b5563',
    };
    Object.entries(paperColors).forEach(([name, value]) => tempDiv.style.setProperty(name, value));
    tempDiv.style.color = '#20242a';
    // Variables become their values before html2canvas rasterizes the clone,
    // otherwise the PDF shows a blue pill reading `{{ user.name }}` while
    // Ctrl+P on the same document prints the value. #R23-64
    tempDiv.innerHTML = substituteVariableValues(element.innerHTML)
    // html2canvas doesn't honor @media print, so strip the page-break widget
    // chrome or it rasterizes the "PAGE BREAK" label/band into the PDF. #4
    stripPageBreakChrome(tempDiv)
    // Video players become watch links — html2canvas cannot reach a
    // cross-origin player's document, so the PDF rasterized an empty box
    // where the video was. #R29-1
    degradeVideoEmbeds(tempDiv)
    // Same for embed chrome — this path reads the LIVE editor DOM, so an
    // embed selected at export time would otherwise rasterize its solid
    // selection border AND the four corner resize handles into the PDF (a
    // deselected one, its dashed affordance border). #R28-1
    stripEmbedChrome(tempDiv)
    document.body.appendChild(tempDiv)

    try {
      // Snapshot before waiting for converters so writing can continue safely.
      const [{ default: html2canvas }, { default: jsPDF }, { measurePdfPages, waitForPdfResources }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
        import('./pdfPagination'),
      ]);
      checkCancelled();
      await waitForPdfResources(tempDiv, options.signal);
      checkCancelled();
      const margin = 12;
      const imageWidth = 210 - margin * 2;
      const imageHeight = 297 - margin * 2;
      const width = Math.ceil(tempDiv.getBoundingClientRect().width) || 800;
      const pageHeight = Math.floor(width * imageHeight / imageWidth);
      const pages = measurePdfPages(tempDiv, pageHeight);
      console.debug('[NextLevelEditor] PDF pages planned', { pages: pages.length, width, pageHeight });
      options.onProgress?.(0, pages.length);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      for (const [index, page] of pages.entries()) {
        await yieldPdfRendering();
        checkCancelled();
        // Bound every bitmap, including on older mobile canvas implementations.
        // Rendering one document-height canvas silently returned "data:," for
        // a 1,000-paragraph manuscript and failed with a PNG signature error.
        const scale = Math.min(2, Math.sqrt(3_000_000 / (width * page.height)));
        const canvas = await html2canvas(tempDiv, {
          width, height: page.height, y: page.top, scale,
          windowWidth: Math.max(1024, width),
          useCORS: true, logging: false, backgroundColor: '#ffffff',
        });
        try {
          checkCancelled();
          const image = canvas.toDataURL('image/png');
          if (image === 'data:,' || !canvas.width || !canvas.height) throw new Error('PDF page rendering returned an empty image');
          if (index) pdf.addPage();
          pdf.addImage(image, 'PNG', margin, margin, imageWidth, canvas.height * imageWidth / canvas.width, undefined, 'FAST');
          pdf.setFontSize(9);
          pdf.setTextColor(100);
          pdf.text(String(index + 1), 105, 291, { align: 'center' });
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
        completed = index + 1;
        options.onProgress?.(completed, pages.length);
      }
      checkCancelled();
      pdf.save(filename)
      console.debug('[NextLevelEditor] PDF export completed', { pages: completed });
    } finally {
      // Always remove the off-screen clone — on the success path AND on any
      // html2canvas/jsPDF failure. It used to leak permanently on failure
      // (the sole remove() sat after the awaited render), and every retry
      // appended another full-document copy with duplicated element ids.
      tempDiv.remove()
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') console.debug('[NextLevelEditor] PDF export cancelled', { completed });
    else console.error('Error exporting PDF:', { completed, name: error instanceof Error ? error.name : 'UnknownError' });
    throw error
  }
}

/**
 * Export as Word document
 * @param html - HTML content to export
 * @param filename - Filename for export
 */
export async function exportAsWord(html: string, filename: string = 'document.docx') {
  try {
    // Lazy-load the Word-conversion lib only when export is actually invoked.
    const { asBlob } = await import('html-docx-js-typescript')

    // Variables become their values: an export is a finished document. #R23-64
    // And the page-break widget becomes a REAL Word page break instead of the
    // literal text "Page Break" in the middle of the document. #R24-2
    // Embed chrome (the dashed affordance border Word would faithfully draw
    // around every image and video) goes too. #R28-1
    // Video players become watch links FIRST — Word cannot render an iframe,
    // so without this the video vanished from the .docx. #R29-1
    html = stripEmbedChromeFromHtml(
      stripPageBreakChromeFromHtml(
        degradeVideoEmbedsFromHtml(substituteVariableValues(html))
      )
    )

    // Create a full HTML document for better Word conversion
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Exported Document</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
    }
    h1 { font-size: 24pt; margin: 12pt 0; }
    h2 { font-size: 20pt; margin: 10pt 0; }
    h3 { font-size: 16pt; margin: 8pt 0; }
    h4 { font-size: 14pt; margin: 6pt 0; }
    h5 { font-size: 12pt; margin: 4pt 0; }
    h6 { font-size: 10pt; margin: 2pt 0; }
    p { margin: 6pt 0; }
    ul, ol { margin: 6pt 0; padding-left: 24pt; }
    li { margin: 3pt 0; }
    ul.checklist { list-style: none; padding-left: 0; }
    ul.checklist li { position: relative; padding-left: 1.75em; }
    ul.checklist li::before { content: "\\2610"; position: absolute; left: 0; }
    ul.checklist li[data-checked="true"]::before { content: "\\2611"; }
    ul.checklist li[data-checked="true"] { text-decoration: line-through; color: #888; }
    blockquote {
      margin: 12pt 0;
      padding-left: 12pt;
      border-left: 3pt solid #3b82f6;
      color: #666;
    }
    code {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 2pt 4pt;
    }
    pre {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 12pt;
      margin: 6pt 0;
    }
    img {
      max-width: 100%;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`

    // Convert HTML to Word document blob
    const result = await asBlob(fullHtml)
    
    // Convert to Blob if it's a Buffer
    const blob = result instanceof Blob ? result : new Blob([new Uint8Array(result)])
    
    // Download the blob
    downloadFile(blob, filename)
  } catch (error) {
    console.error('Error exporting Word document:', error)
    throw error
  }
}
