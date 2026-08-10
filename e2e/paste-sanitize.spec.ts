import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// Desktop editing UI + clipboard permissions (webkit differs). Runs on chromium
// only (like responsive.spec).
test.beforeEach(() => {
  test.skip(
    test.info().project.name === 'mobile-safari',
    'desktop editing flow; mobile has its own UI/clipboard permissions'
  )
})

// Copy / paste sanitization — real-browser coverage for the HTML sanitizer
// (src/composables/useHtmlSanitizer.ts) exercised through the REAL paste path.
//
// The editor has a `paste` handler (NextLevelEditor.onPaste): a native Ctrl+V is
// intercepted, the clipboard's rich HTML is run through sanitizeHtml, and only
// the cleaned markup is inserted into the contenteditable — so the LIVE editing
// surface is sanitized, not just the emitted v-model. The subsequent `input`
// event re-sanitizes and emits the model. The Playground's Output → "Source" tab
// renders that emitted v-model verbatim, the definitive view of what the app
// hands back to a host application.
//
// These tests dispatch a genuine clipboard paste (Clipboard API write + Ctrl+V)
// and, for adversarial probing that Chromium's own paste-sanitizer would
// otherwise mask, also feed raw HTML straight into the same reactive
// input→sanitize pipeline via innerHTML + a real `input` event.

// Must track playwright.config.ts's E2E_PORT override, or grantPermissions
// would target an origin the tests never visit and clipboard access silently
// stays denied.
const ORIGIN = `http://localhost:${process.env.E2E_PORT || '5173'}`

async function grantClipboard(context: BrowserContext) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: ORIGIN,
  })
}

/** Put HTML (and a plain-text fallback) on the real clipboard. */
async function setClipboardHtml(page: Page, html: string, plain = 'fallback') {
  await page.evaluate(
    async ({ html, plain }) => {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([item])
    },
    { html, plain }
  )
}

/** Put ONLY plain text on the real clipboard (no text/html flavour). */
async function setClipboardText(page: Page, text: string) {
  await page.evaluate(async (t) => {
    const item = new ClipboardItem({
      'text/plain': new Blob([t], { type: 'text/plain' }),
    })
    await navigator.clipboard.write([item])
  }, text)
}

async function clearEditor(page: Page) {
  const editor = page.locator('.editor-content')
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
}

/** Read the emitted v-model (the app-sanitized output) from the Source tab. */
function modelSource(page: Page) {
  return page.locator('.out-html pre code')
}
async function openSource(page: Page) {
  await page.getByRole('button', { name: 'Source', exact: true }).click()
}

/** Does any element under `root` carry an inline on* event-handler attribute? */
async function hasInlineHandler(page: Page): Promise<boolean> {
  return page.locator('.editor-content').evaluate((el) =>
    Array.from(el.querySelectorAll('*')).some((n) =>
      Array.from((n as Element).attributes).some((a) =>
        a.name.toLowerCase().startsWith('on')
      )
    )
  )
}

test.describe('Copy/paste sanitization — real clipboard paste', () => {
  test.beforeEach(async ({ page, context }) => {
    await grantClipboard(context)
    await page.goto('/?empty=true')
    await page.waitForSelector('.editor-content')
  })

  test('rich HTML paste keeps the allowed formatting tags', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await clearEditor(page)

    await setClipboardHtml(
      page,
      '<h2>Heading Two</h2>' +
        '<p><strong>bolded</strong> <em>italicised</em> <u>underlined</u> ' +
        '<b>btag</b> <i>itag</i></p>' +
        '<ul><li>alpha</li><li>beta</li></ul>' +
        '<p><a href="https://example.com/page">the link</a></p>'
    )
    await page.keyboard.press('Control+V')

    // Rendered structure survives in the live editing surface.
    await expect(editor.locator('h2')).toContainText('Heading Two')
    await expect(editor.locator('strong')).toContainText('bolded')
    await expect(editor.locator('em')).toContainText('italicised')
    await expect(editor.locator('u')).toContainText('underlined')
    await expect(editor.locator('li')).toHaveCount(2)
    await expect(editor.locator('li').first()).toContainText('alpha')
    await expect(
      editor.locator('a[href*="example.com"]')
    ).toContainText('the link')

    // The saved v-model keeps the same allowed tags.
    await openSource(page)
    const src = modelSource(page)
    await expect(src).toContainText('<h2')
    await expect(src).toContainText('<strong>bolded</strong>')
    await expect(src).toContainText('<em>italicised</em>')
    await expect(src).toContainText('<li>alpha</li>')
    await expect(src).toContainText('example.com')
  })

  test('pasted <script> never executes nor lands in the editor', async ({
    page,
  }) => {
    await clearEditor(page)
    await setClipboardHtml(
      page,
      '<p>safe copy</p><script>window.__pasteXssScript = 1; badFn()</script>'
    )
    await page.keyboard.press('Control+V')

    const editor = page.locator('.editor-content')
    await expect(editor).toContainText('safe copy')

    // No <script> element in the live editing surface, and it did not run.
    await expect(editor.locator('script')).toHaveCount(0)
    expect(
      await page.evaluate(() => (window as { __pasteXssScript?: number }).__pasteXssScript)
    ).toBeUndefined()

    // ...and it is absent from the emitted v-model.
    await openSource(page)
    await expect(modelSource(page)).not.toContainText('<script')
    await expect(modelSource(page)).toContainText('safe copy')
  })

  test('pasted image onerror handler is neutralized (no execution)', async ({
    page,
  }) => {
    await clearEditor(page)
    await setClipboardHtml(
      page,
      '<img src="does-not-exist.gif" onerror="window.__pasteXssImg = 1">' +
        '<p>after image</p>'
    )
    await page.keyboard.press('Control+V')

    const editor = page.locator('.editor-content')
    await expect(editor).toContainText('after image')

    // The failing image never fires an inline handler and none survives.
    expect(await hasInlineHandler(page)).toBe(false)
    // Give any (non-existent) error handler a chance to have run.
    await page.waitForTimeout(200)
    expect(
      await page.evaluate(() => (window as { __pasteXssImg?: number }).__pasteXssImg)
    ).toBeUndefined()
  })

  test('pasted javascript: link is neutralized', async ({ page }) => {
    await clearEditor(page)
    await setClipboardHtml(
      page,
      '<a href="javascript:window.__pasteXssJs = 1">tempting link</a>'
    )
    await page.keyboard.press('Control+V')

    const editor = page.locator('.editor-content')
    await expect(editor).toContainText('tempting link')

    // No anchor in the editor keeps a javascript: URL.
    const jsHref = await editor.evaluate((el) =>
      Array.from(el.querySelectorAll('a')).some((a) =>
        (a.getAttribute('href') ?? '').trim().toLowerCase().startsWith('javascript:')
      )
    )
    expect(jsHref).toBe(false)

    await openSource(page)
    await expect(modelSource(page)).not.toContainText('javascript:')
  })

  test('plain-text paste inserts the text', async ({ page }) => {
    await clearEditor(page)
    await setClipboardText(page, 'just some plain text')
    await page.keyboard.press('Control+V')

    await expect(page.locator('.editor-content')).toContainText(
      'just some plain text'
    )
  })

  test('HTML-looking plain text is inserted literally, not as live markup', async ({
    page,
  }) => {
    await clearEditor(page)
    // A text/plain payload that *looks* like HTML must not become real markup.
    await setClipboardText(page, '<b>not actually bold</b>')
    await page.keyboard.press('Control+V')

    const editor = page.locator('.editor-content')
    // The angle brackets are shown as text; no <b> element is created.
    await expect(editor).toContainText('<b>not actually bold</b>')
    await expect(editor.locator('b')).toHaveCount(0)
  })

  // The app-level paste handler (onPaste) sanitizes the clipboard HTML BEFORE
  // it reaches the contenteditable, so a pasted arbitrary-origin <iframe> the
  // allowlist rejects never lands in the live editing surface (not just the
  // emitted model).
  test('pasted arbitrary <iframe> is stripped from both the editor DOM and the model', async ({
    page,
  }) => {
    await clearEditor(page)
    await setClipboardHtml(
      page,
      '<iframe src="https://example.com/evil"></iframe><p>after frame</p>'
    )
    await page.keyboard.press('Control+V')

    const editor = page.locator('.editor-content')
    await expect(editor).toContainText('after frame')

    // The arbitrary iframe is absent from the LIVE editing surface.
    await expect(editor.locator('iframe')).toHaveCount(0)

    // ...and absent from the saved model.
    await openSource(page)
    await expect(modelSource(page)).not.toContainText('<iframe')
    await expect(modelSource(page)).toContainText('after frame')
  })

  // Same guarantee for pasted <form> controls: sanitized out of the live surface
  // before insertion, not merely stripped from the emitted model.
  test('pasted <form> controls are stripped from both the editor DOM and the model', async ({
    page,
  }) => {
    await clearEditor(page)
    await setClipboardHtml(
      page,
      '<form action="https://evil.example/steal">' +
        '<input name="cc"><button>Submit</button></form><p>after form</p>'
    )
    await page.keyboard.press('Control+V')

    const editor = page.locator('.editor-content')
    await expect(editor).toContainText('after form')

    // Interactive form controls never enter the editing surface.
    await expect(editor.locator('form')).toHaveCount(0)
    await expect(editor.locator('input[name="cc"]')).toHaveCount(0)

    // ...and the emitted model strips the form entirely too.
    await openSource(page)
    await expect(modelSource(page)).not.toContainText('<form')
    await expect(modelSource(page)).not.toContainText('<input')
  })
})

test.describe('Copy/paste sanitization — sanitizer hardening (input pipeline)', () => {
  // These drive the exact same reactive onInput -> sanitizeHtml pipeline that
  // paste uses, but feed raw HTML directly (innerHTML + a real input event) so
  // we can probe the app's OWN sanitizer for vectors Chromium's clipboard layer
  // would otherwise pre-sanitize. We assert on the emitted v-model (Source tab).
  test.beforeEach(async ({ page, context }) => {
    await grantClipboard(context)
    await page.goto('/?empty=true')
    await page.waitForSelector('.editor-content')
    await page.locator('.editor-content').click()
  })

  async function feed(page: Page, html: string) {
    await page.locator('.editor-content').evaluate((el, h) => {
      el.innerHTML = h
      el.dispatchEvent(new InputEvent('input', { bubbles: true }))
    }, html)
    await openSource(page)
  }

  test('strips inline on* event-handler attributes from the model', async ({
    page,
  }) => {
    await feed(
      page,
      '<p onclick="steal()">para</p><b onmouseover="x()">bold</b>'
    )
    const src = modelSource(page)
    await expect(src).toContainText('para')
    await expect(src).toContainText('bold')
    await expect(src).not.toContainText('onclick')
    await expect(src).not.toContainText('onmouseover')
  })

  test('drops javascript: hrefs but keeps safe hrefs (and hardens them)', async ({
    page,
  }) => {
    await feed(
      page,
      '<a href="javascript:evil()">bad</a>' +
        '<a href="https://good.example/x">good</a>' +
        '<a href="mailto:a@b.com">mail</a>'
    )
    const src = modelSource(page)
    await expect(src).not.toContainText('javascript:')
    await expect(src).toContainText('https://good.example/x')
    await expect(src).toContainText('mailto:a@b.com')
    // External links are hardened against tab-nabbing.
    await expect(src).toContainText('noopener')
    await expect(src).toContainText('noreferrer')
  })

  test('removes <script> nested inside allowed content, keeps surrounding text', async ({
    page,
  }) => {
    await feed(
      page,
      // A disallowed wrapper (div, unwrapped) holding an allowed paragraph and
      // a nested script — the script and its body must vanish.
      '<div><p>before<script>window.__nested = 1; hack()</script>after</p></div>'
    )
    const src = modelSource(page)
    await expect(src).not.toContainText('<script')
    await expect(src).not.toContainText('hack()')
    await expect(src).toContainText('beforeafter')
    // Setting innerHTML never executes inserted <script>, but assert anyway.
    expect(
      await page.evaluate(() => (window as { __nested?: number }).__nested)
    ).toBeUndefined()
  })

  test('filters unsafe/disallowed style declarations but keeps safe ones', async ({
    page,
  }) => {
    await feed(
      page,
      '<p style="color:red;position:fixed;background-color:yellow">styled</p>' +
        '<p style="background:url(javascript:alert(1))">jsbg</p>'
    )
    const src = modelSource(page)
    await expect(src).toContainText('styled')
    await expect(src).toContainText('jsbg')
    // Safe declarations are preserved.
    await expect(src).toContainText('color: red')
    // Dangerous / non-allowlisted declarations are dropped.
    await expect(src).not.toContainText('position')
    await expect(src).not.toContainText('javascript:')
    await expect(src).not.toContainText('url(')
  })
})
