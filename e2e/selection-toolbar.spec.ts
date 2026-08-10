import { test, expect, type Page } from '@playwright/test'

// Desktop editing UI (main toolbar + range selection). Mobile uses a different
// toolbar/selection model, so this runs on chromium only (like responsive.spec).
test.beforeEach(() => {
  test.skip(
    test.info().project.name === 'mobile-safari',
    'desktop editing flow; mobile has its own UI'
  )
})

// Real-browser coverage for the floating "selection toolbar" bubble
// (src/composables/useFloatingToolbar.ts + src/components/FloatingToolbar.vue).
//
// The bubble is teleported to <body>, so it is queried from the page root, not
// from inside .editor-content. Its buttons carry the SAME aria-labels as the
// main toolbar ("Bold", "Italic", …) so EVERY locator here is scoped to
// `.floating-toolbar` to avoid grabbing the main-toolbar button of the same
// name.
//
// The bubble only exists in the DOM while a non-collapsed text selection with
// real text is present (v-if="show && position"), which makes toHaveCount() a
// faithful presence/absence probe — and a direct regression guard against the
// old bug where 5 bubble instances stacked up.

const BUBBLE = '.floating-toolbar'

/** Focus the editor and clear whatever the playground seeded. */
async function freshEditor(page: Page) {
  const editor = page.locator('.editor-content')
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  return editor
}

/**
 * Select the `occurrence`-th appearance of `text` inside the editor via a real
 * DOM Range. Programmatically mutating the selection fires a native
 * `selectionchange`; we also dispatch one explicitly as a belt-and-suspenders
 * so the editor's selectionchange listener (which drives updateFloatingToolbar)
 * runs deterministically.
 */
async function selectSubstring(page: Page, text: string, occurrence = 0) {
  await page.evaluate(
    ({ text, occurrence }) => {
      const editor = document.querySelector('.editor-content')
      if (!editor) return
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      let node: Node | null
      let seen = 0
      while ((node = walker.nextNode())) {
        const content = node.textContent || ''
        const idx = content.indexOf(text)
        if (idx !== -1) {
          if (seen === occurrence) {
            const range = document.createRange()
            range.setStart(node, idx)
            range.setEnd(node, idx + text.length)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
            document.dispatchEvent(new Event('selectionchange'))
            return
          }
          seen++
        }
      }
    },
    { text, occurrence }
  )
}

/** Select from the very start of the first text node to the end of the last. */
async function selectAcrossBlocks(page: Page) {
  await page.evaluate(() => {
    const editor = document.querySelector('.editor-content')
    if (!editor) return
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    const nodes: Node[] = []
    let n: Node | null
    while ((n = walker.nextNode())) nodes.push(n)
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const range = document.createRange()
    range.setStart(first, 0)
    range.setEnd(last, (last.textContent || '').length)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
}

/** Collapse the current selection to a caret without leaving the editor. */
async function collapseSelection(page: Page) {
  await page.evaluate(() => {
    const sel = window.getSelection()
    sel?.collapseToEnd()
    document.dispatchEvent(new Event('selectionchange'))
  })
}

test.describe('Selection / floating toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?empty=true')
    await page.waitForSelector('.editor-content')
  })

  test('no bubble exists before anything is selected', async ({ page }) => {
    // Fresh empty editor, nothing selected -> the bubble must not be mounted.
    await expect(page.locator(BUBBLE)).toHaveCount(0)
  })

  test('selecting a word shows the bubble with its format buttons', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('Select a single word here')

    await selectSubstring(page, 'single')

    const bubble = page.locator(BUBBLE)
    await expect(bubble).toBeVisible()

    // Comments are enabled in the playground, so the bubble carries the four
    // core inline actions plus Comment.
    await expect(bubble.locator('button[aria-label="Bold"]')).toBeVisible()
    await expect(bubble.locator('button[aria-label="Italic"]')).toBeVisible()
    await expect(bubble.locator('button[aria-label="Underline"]')).toBeVisible()
    await expect(bubble.locator('button[aria-label="Link"]')).toBeVisible()
    await expect(bubble.locator('button[aria-label="Comment"]')).toBeVisible()
    await expect(bubble.locator('.floating-btn')).toHaveCount(5)
  })

  test('EXACTLY ONE bubble is mounted, never a stack (regression: 5 stacked)', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('One bubble only please')

    // Selection via a word...
    await selectSubstring(page, 'bubble')
    await expect(page.locator(BUBBLE)).toBeVisible()
    await expect(page.locator(BUBBLE)).toHaveCount(1)

    // ...then a full Select-All, which re-runs the show path. Still one node.
    await page.keyboard.press('Control+A')
    await expect(page.locator(BUBBLE)).toBeVisible()
    await expect(page.locator(BUBBLE)).toHaveCount(1)

    // ...and a different word. The bubble is a single persistent teleported
    // node, never a fresh instance per selection.
    await selectSubstring(page, 'please')
    await expect(page.locator(BUBBLE)).toBeVisible()
    await expect(page.locator(BUBBLE)).toHaveCount(1)
  })

  test('clicking Bold in the bubble bolds only the selection', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('one two three')

    await selectSubstring(page, 'two')
    const bubble = page.locator(BUBBLE)
    await expect(bubble).toBeVisible()

    await bubble.locator('button[aria-label="Bold"]').click()

    // Exactly the selected word is wrapped; surrounding text is untouched.
    await expect(editor.locator('strong')).toHaveText('two')
    await expect(editor).toContainText('one two three')
  })

  test('Italic and Underline from the bubble wrap their own selections', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('alpha beta gamma')
    const bubble = page.locator(BUBBLE)

    await selectSubstring(page, 'beta')
    await expect(bubble).toBeVisible()
    await bubble.locator('button[aria-label="Italic"]').click()
    await expect(editor.locator('em')).toHaveText('beta')

    await selectSubstring(page, 'gamma')
    await expect(bubble).toBeVisible()
    await bubble.locator('button[aria-label="Underline"]').click()
    await expect(editor.locator('u')).toHaveText('gamma')

    await expect(editor).toContainText('alpha beta gamma')
  })

  test('the bubble hides when the selection collapses via keyboard', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('collapse me with an arrow')

    await selectSubstring(page, 'collapse')
    await expect(page.locator(BUBBLE)).toBeVisible()

    // Collapsing to a caret must tear the bubble down.
    await page.keyboard.press('ArrowRight')
    await expect(page.locator(BUBBLE)).toHaveCount(0)
  })

  test('the bubble hides when the user clicks outside the editor', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('click away to dismiss')

    await selectSubstring(page, 'dismiss')
    await expect(page.locator(BUBBLE)).toBeVisible()

    // Click a static region outside the editing surface (the playground header).
    await page.locator('.pg-head').click()
    await expect(page.locator(BUBBLE)).toHaveCount(0)
  })

  test('the bubble repositions when the selection moves to a far word', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    // A single wide line so the first and last words sit far apart horizontally.
    await editor.pressSequentially(
      'Alpha beta gamma delta epsilon zeta eta theta iota Zulu'
    )
    const bubble = page.locator(BUBBLE)

    await selectSubstring(page, 'Alpha')
    await expect(bubble).toBeVisible()
    const firstBox = await bubble.boundingBox()
    expect(firstBox).not.toBeNull()
    const firstX = firstBox ? firstBox.x : 0

    // Move the selection to the far-right word; the bubble must chase it.
    await selectSubstring(page, 'Zulu')
    await expect
      .poll(
        async () => {
          const b = await bubble.boundingBox()
          return b ? Math.abs(b.x - firstX) : 0
        },
        { timeout: 5000 }
      )
      .toBeGreaterThan(50)
  })

  test('selecting across block boundaries still shows a single bubble', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('First paragraph')
    await page.keyboard.press('Enter')
    await editor.pressSequentially('Second paragraph')

    // Two <p> blocks now exist; select from inside the first to inside the last.
    const paras = editor.locator('p')
    expect(await paras.count()).toBeGreaterThanOrEqual(2)

    await selectAcrossBlocks(page)

    const bubble = page.locator(BUBBLE)
    await expect(bubble).toBeVisible()
    await expect(bubble).toHaveCount(1)
    // A cross-block selection is a valid range; Bold from the bubble stays live.
    await expect(bubble.locator('button[aria-label="Bold"]')).toBeVisible()
  })

  test('rapid select / deselect never stacks bubbles and ends in the right state', async ({
    page,
  }) => {
    const editor = await freshEditor(page)
    await editor.pressSequentially('flicker the selection quickly')
    const bubble = page.locator(BUBBLE)

    // Hammer the show/hide path several times.
    for (let i = 0; i < 4; i++) {
      await selectSubstring(page, 'flicker')
      await collapseSelection(page)
    }

    // Land on a real selection: exactly one bubble, and it is visible.
    await selectSubstring(page, 'selection')
    await expect(bubble).toBeVisible()
    await expect(bubble).toHaveCount(1)

    // Land collapsed: the bubble is gone entirely.
    await collapseSelection(page)
    await expect(bubble).toHaveCount(0)
  })
})
