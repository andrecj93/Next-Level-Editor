/**
 * Export utility functions for converting editor content to different formats
 */

/**
 * Format/pretty-print HTML with proper indentation
 * @param html - HTML content to format
 * @param indentSize - Number of spaces for indentation (default: 2)
 * @returns Formatted HTML string
 */
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
      return text
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      const tagName = element.tagName.toLowerCase()
      const isInline = inlineElements.has(tagName)
      const isSelfClosing = selfClosingElements.has(tagName)

      // Get attributes
      const attrs = Array.from(element.attributes)
        .map(attr => ` ${attr.name}="${attr.value}"`)
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
              return child.textContent || ''
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
              return child.textContent || ''
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
        case 'p':
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
        case 'pre':
          return `\`\`\`\n${children}\n\`\`\`\n\n`
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
          const parent = element.parentElement
          if (parent?.tagName.toLowerCase() === 'ol') {
            const index = Array.from(parent.children).indexOf(element) + 1
            return `${index}. ${children}\n`
          }
          return `- ${children}\n`
        }
        case 'hr':
          return '---\n\n'
        case 'br':
          return '\n'
        default:
          return children
      }
    }

    return ''
  }

  return convert(temp).trim()
}

/**
 * Download content as a file
 * @param content - Content to download
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
  const formattedBody = prettify 
    ? bodyContent.split('\n').map(line => line ? `${BODY_INDENT}${line}` : '').join('\n') 
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
