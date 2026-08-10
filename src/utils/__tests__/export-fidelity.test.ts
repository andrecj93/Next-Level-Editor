import { describe, it, expect } from 'vitest'
import { htmlToMarkdown, formatHtml } from '../export'

/**
 * Export-fidelity regression tests:
 * 1. formatHtml must re-escape entities the DOM decoded (text + attributes).
 * 2. htmlToMarkdown must emit GFM pipe tables instead of flattening cells.
 * 3. htmlToMarkdown must preserve iframe/video embeds as links.
 */
describe('export fidelity', () => {
  describe('formatHtml entity escaping', () => {
    it('round-trips text containing < > & without corruption', () => {
      const html = '<p>if a &lt; b &amp;&amp; c &gt; d</p>'
      const result = formatHtml(html)

      expect(result).toBe('<p>if a &lt; b &amp;&amp; c &gt; d</p>')

      // Parse the exported markup back and assert the text survived intact.
      const reparsed = document.createElement('div')
      reparsed.innerHTML = result
      expect(reparsed.querySelector('p')?.textContent).toBe('if a < b && c > d')
      // The raw `<` must not have opened a bogus element.
      expect(reparsed.querySelectorAll('*').length).toBe(1)
    })

    it('round-trips text inside inline elements', () => {
      const html = '<p>check <strong>x &lt; y &amp; z</strong> now</p>'
      const result = formatHtml(html)

      const reparsed = document.createElement('div')
      reparsed.innerHTML = result
      expect(reparsed.querySelector('strong')?.textContent).toBe('x < y & z')
      expect(reparsed.querySelector('p')?.textContent).toBe('check x < y & z now')
    })

    it('escapes double quotes and ampersands in attribute values', () => {
      const source = document.createElement('div')
      const p = document.createElement('p')
      p.setAttribute('title', 'She said "hi" & left')
      p.textContent = 'Quoted title'
      source.appendChild(p)

      const result = formatHtml(source.innerHTML)
      expect(result).toContain('title="She said &quot;hi&quot; &amp; left"')

      // Round-trip: the reparsed attribute must be byte-identical.
      const reparsed = document.createElement('div')
      reparsed.innerHTML = result
      expect(reparsed.querySelector('p')?.getAttribute('title')).toBe('She said "hi" & left')
    })

    it('escapes angle brackets in attribute values', () => {
      // Note: assert on the emitted markup rather than a reparse round-trip —
      // happy-dom's attribute parser decodes &quot;/&amp; but not &lt;/&gt;
      // (real browsers decode all of them).
      const source = document.createElement('div')
      const img = document.createElement('img')
      img.setAttribute('alt', 'a "quoted" & <odd> alt')
      img.setAttribute('src', 'image.jpg')
      source.appendChild(img)

      const result = formatHtml(source.innerHTML)
      expect(result).toContain('alt="a &quot;quoted&quot; &amp; &lt;odd&gt; alt"')
      // The raw `<odd>` must not have produced a stray element in the output.
      const reparsed = document.createElement('div')
      reparsed.innerHTML = result
      expect(reparsed.querySelectorAll('*').length).toBe(1)
    })
  })

  describe('htmlToMarkdown tables', () => {
    it('converts a 2x2 table with a thead header to a GFM pipe table', () => {
      const html =
        '<table><thead><tr><th>H1</th><th>H2</th></tr></thead>' +
        '<tbody><tr><td>A</td><td>B</td></tr></tbody></table>'
      expect(htmlToMarkdown(html)).toBe('| H1 | H2 |\n| --- | --- |\n| A | B |')
    })

    it('converts a table without a thead (first row of th) to a GFM pipe table', () => {
      const html =
        '<table><tr><th>H1</th><th>H2</th></tr><tr><td>A</td><td>B</td></tr></table>'
      expect(htmlToMarkdown(html)).toBe('| H1 | H2 |\n| --- | --- |\n| A | B |')
    })

    it('synthesizes a separator after the first row even without any header cells', () => {
      const html =
        '<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>'
      expect(htmlToMarkdown(html)).toBe('| A | B |\n| --- | --- |\n| C | D |')
    })

    it('escapes pipe characters inside cell text', () => {
      const html = '<table><tr><td>a|b</td><td>plain</td></tr></table>'
      expect(htmlToMarkdown(html)).toBe('| a\\|b | plain |\n| --- | --- |')
    })

    it('keeps inline formatting inside cells', () => {
      const html =
        '<table><thead><tr><th>Name</th></tr></thead>' +
        '<tbody><tr><td><strong>bold</strong> cell</td></tr></tbody></table>'
      expect(htmlToMarkdown(html)).toBe('| Name |\n| --- |\n| **bold** cell |')
    })
  })

  describe('htmlToMarkdown embeds', () => {
    it('converts a YouTube iframe inside the embed container to a video link', () => {
      // Mirrors the markup produced by getYouTubeEmbedHtml in src/utils/embed.ts
      const html = `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe
    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    title="YouTube video player"
  ></iframe>
</div>`
      expect(htmlToMarkdown(html)).toBe(
        '[Embedded video](https://www.youtube.com/embed/dQw4w9WgXcQ)'
      )
    })

    it('converts a video element using a nested source src', () => {
      const html = '<video controls><source src="movie.mp4" type="video/mp4"></video>'
      expect(htmlToMarkdown(html)).toBe('[Embedded video](movie.mp4)')
    })

    it('prefers the video element own src attribute', () => {
      const html = '<video src="direct.mp4" controls></video>'
      expect(htmlToMarkdown(html)).toBe('[Embedded video](direct.mp4)')
    })

    it('emits nothing for an iframe without a src', () => {
      const html = '<p>before</p><iframe title="empty"></iframe><p>after</p>'
      expect(htmlToMarkdown(html)).toBe('before\n\nafter')
    })
  })
})

import { describe as describeSsr, it as itSsr, expect as expectSsr, afterEach as afterEachSsr, vi as viSsr } from 'vitest'
import { formatHtml as formatHtmlSsr } from '../export'

// formatHtml feeds the code-view "formatted-html-content" prop, which is
// evaluated during render — so it ran on the server and threw
// `document is not defined`. It must return the content unformatted on the
// server (the client re-formats on hydration) rather than crash the page.
describeSsr('formatHtml is SSR-safe', () => {
  afterEachSsr(() => viSsr.unstubAllGlobals())
  itSsr('returns the html without throwing when document is absent', () => {
    viSsr.stubGlobal('document', undefined)
    expectSsr(() => formatHtmlSsr('<p>hi</p>')).not.toThrow()
    expectSsr(formatHtmlSsr('<p>hi</p>')).toContain('hi')
  })
})
