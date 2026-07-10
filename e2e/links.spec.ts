import { test, expect, type Page } from '@playwright/test'

// Real-browser coverage for link insertion via the LinkModal, focused on the
// selection/caret-context fix: opening the modal moves focus to its input, which
// used to collapse the editor's selection to a caret at offset 0 — so a link
// dropped in at the document start labelled with the raw URL instead of wrapping
// the user's selection. performWithSelection now prefers the remembered range
// when focus was pulled into the editor. Desktop-only (chromium), like the other
// core-editing specs.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === 'mobile-safari',
    'desktop editing flow; mobile has its own UI'
  )
})

const EDITOR = '.editor-content'

async function openEmptyEditor(page: Page) {
  await page.goto('/?empty=true')
  await page.waitForSelector(EDITOR)
  const editor = page.locator(EDITOR)
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  return editor
}

async function openLinkModal(page: Page) {
  // Insert dropdown -> Link. The dropdown trigger's mousedown remembers the
  // current editor selection before the menu opens.
  await page
    .locator('.editor-toolbar-modern button[aria-label="Insert"]')
    .click()
  await page.locator('.dropdown-menu button[aria-label="Link"]').click()
  await expect(page.locator('#link-url')).toBeVisible()
}

test.describe('Links — insertion over selection & at caret', () => {
  test('inserting a link over a selection WRAPS the selected text', async ({
    page,
  }) => {
    const editor = await openEmptyEditor(page)
    await editor.pressSequentially('Visit our site')
    await page.keyboard.press('Control+A') // select the whole phrase

    await openLinkModal(page)
    await page.locator('#link-url').fill('https://example.com')
    await page.locator('.insert-button').click()

    // Exactly one anchor, wrapping the selected text (not a URL-labelled anchor
    // dropped at the document start).
    const link = editor.locator('a[href="https://example.com"]')
    await expect(link).toHaveCount(1)
    await expect(link).toHaveText('Visit our site')
    await expect(editor.locator('a')).toHaveCount(1)
  })

  test('inserting a link at the caret places it at the caret, not the document start', async ({
    page,
  }) => {
    const editor = await openEmptyEditor(page)
    await editor.pressSequentially('ZZZ') // collapsed caret left at the end

    await openLinkModal(page)
    await page.locator('#link-url').fill('https://pos.example')
    await page.locator('#link-text').fill('L')
    await page.locator('.insert-button').click()

    const link = editor.locator('a[href="https://pos.example"]')
    await expect(link).toHaveText('L')
    // Inserted at the caret (after ZZZ) — not "LZZZ" at the start.
    await expect(editor).toHaveText('ZZZL')
  })

  test('a bare domain is normalized to https://', async ({ page }) => {
    const editor = await openEmptyEditor(page)
    await editor.pressSequentially('home')
    await page.keyboard.press('Control+A')

    await openLinkModal(page)
    await page.locator('#link-url').fill('example.com')
    await page.locator('.insert-button').click()

    await expect(
      editor.locator('a[href="https://example.com"]')
    ).toHaveCount(1)
  })
})
