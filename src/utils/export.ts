/**
 * Export utility functions for converting editor content to different formats
 */

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
 */
export function exportAsHtml(html: string, filename: string = 'document.html') {
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
${html}
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
