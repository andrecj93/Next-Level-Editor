/**
 * Export utility functions for converting editor content to different formats.
 *
 * jspdf, html2canvas and html-docx-js-typescript are heavy (they dominate bundle
 * size) and only needed for PDF/Word export, so they are lazy-loaded via dynamic
 * import() inside the functions that use them. This keeps them out of the main
 * library chunk — consumers who never export to PDF/Word never download them.
 */

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

      // Handle inline elements
      if (isInline) {
        const children = Array.from(element.childNodes)
          .map(child => {
            if (child.nodeType === Node.TEXT_NODE) {
              return escapeHtmlText(child.textContent || '')
            }
            return format(child, 0)
          })
          .join('')
          .trim()
        return `<${tagName}${attrs}>${children}</${tagName}>`
      }

      // Check if element has inline content (text or inline elements)
      const hasInline = hasInlineChildren(element)

      if (hasInline) {
        // Format inline content on single line
        const children = Array.from(element.childNodes)
          .map(child => {
            if (child.nodeType === Node.TEXT_NODE) {
              return escapeHtmlText(child.textContent || '')
            }
            return format(child, 0)
          })
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
 * Convert HTML to Markdown
 * @param html - HTML content to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html

  const convert = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ''
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
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
          return `${children}\n\n`
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
          return `\`${children}\``
        case 'pre': {
          // If the <pre> wraps a single <code>, emit a clean fenced block using
          // the raw text content, avoiding the backtick-wrapped inner conversion.
          const codeChildren = Array.from(element.children).filter(
            child => child.tagName.toLowerCase() === 'code'
          )
          const onlyCode =
            codeChildren.length === 1 &&
            Array.from(element.childNodes).every(
              child =>
                child.nodeType === Node.ELEMENT_NODE ||
                !(child.textContent || '').trim()
            )
          const code = onlyCode ? element.textContent || '' : children
          return `\`\`\`\n${code}\n\`\`\`\n\n`
        }
        case 'blockquote':
          return `> ${children}\n\n`
        case 'a': {
          const href = element.getAttribute('href') || ''
          return `[${children}](${href})`
        }
        case 'img': {
          const src = element.getAttribute('src') || ''
          const alt = element.getAttribute('alt') || ''
          return `![${alt}](${src})\n\n`
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
          const marker =
            parent?.tagName.toLowerCase() === 'ol'
              ? `${Array.from(parent.children).indexOf(element) + 1}. `
              : '- '
          return `${marker}${ownContent}\n${indentedNested}`
        }
        case 'hr':
          return '---\n\n'
        case 'br':
          return '\n'
        case 'table': {
          // Collect rows whether they sit directly under the table or inside
          // thead/tbody/tfoot sections.
          const rows: HTMLElement[] = []
          Array.from(element.children).forEach(section => {
            const sectionTag = section.tagName.toLowerCase()
            if (sectionTag === 'tr') {
              rows.push(section as HTMLElement)
            } else if (sectionTag === 'thead' || sectionTag === 'tbody' || sectionTag === 'tfoot') {
              Array.from(section.children).forEach(row => {
                if (row.tagName.toLowerCase() === 'tr') {
                  rows.push(row as HTMLElement)
                }
              })
            }
          })
          if (rows.length === 0) {
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
          const rowToLine = (row: HTMLElement): string =>
            `| ${Array.from(row.children).map(cellText).join(' | ')} |`

          // GFM requires a separator after the header row. Treat the first row
          // as the header (a first row of <th> or a <thead> row lands there);
          // even without one, synthesizing the separator after the first row
          // keeps the output rendering as a table.
          const columnCount = Math.max(rows[0].children.length, 1)
          const separator = `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`

          const lines = rows.map(rowToLine)
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
export function exportAsHtml(html: string, filename: string = 'document.html', prettify: boolean = true) {
  const BODY_INDENT = '  ' // 2 spaces to match formatHtml default
  const bodyContent = prettify ? formatHtml(html) : html
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
  const markdown = htmlToMarkdown(html)
  downloadFile(markdown, filename, 'text/markdown')
}

/**
 * Export as PDF
 * @param element - HTML element to export
 * @param filename - Filename for export
 */
export async function exportAsPdf(element: HTMLElement, filename: string = 'document.pdf') {
  try {
    // Lazy-load the heavy PDF/canvas libs only when export is actually invoked.
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Create a temporary container with the content
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    tempDiv.style.width = '800px'
    tempDiv.style.padding = '20px'
    tempDiv.style.backgroundColor = 'white'
    tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    tempDiv.innerHTML = element.innerHTML
    document.body.appendChild(tempDiv)

    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Remove temporary div
    tempDiv.remove()

    // Calculate PDF dimensions
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    let position = 0

    // Add image to PDF (handle multiple pages if needed)
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Save PDF
    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting PDF:', error)
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
