/**
 * Export utility functions for converting editor content to different formats
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { asBlob } from 'html-docx-js-typescript'

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
 * @param content - Content to download (string or Blob)
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file (only used when content is a string)
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
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

/**
 * Export as PDF
 * @param element - HTML element to export
 * @param filename - Filename for export
 */
export async function exportAsPdf(element: HTMLElement, filename: string = 'document.pdf') {
  try {
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
    document.body.removeChild(tempDiv)

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

    while (heightLeft >= 0) {
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
    const blob = await asBlob(fullHtml)
    
    // Download the blob
    downloadFile(blob, filename)
  } catch (error) {
    console.error('Error exporting Word document:', error)
    throw error
  }
}
