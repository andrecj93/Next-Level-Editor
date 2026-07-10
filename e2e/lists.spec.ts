import { test, expect, type Page, type Locator } from '@playwright/test'

// Desktop editing UI (main toolbar + range selection). Mobile uses a different
// toolbar/selection model, so this runs on chromium only (like responsive.spec).
test.beforeEach(() => {
  test.skip(
    test.info().project.name === 'mobile-safari',
    'desktop editing flow; mobile has its own UI'
  )
})

// Real-browser coverage for the list subsystem (src/utils/formatting.ts
// toggleList / indentListItem / outdentListItem + the toolbar list buttons and
// the Tab/Shift+Tab keyboard path in useKeyboardShortcuts.ts).
//
// happy-dom unit tests cover the pure functions; this suite drives the ACTUAL
// contenteditable + Selection + performWithSelection round-trip that only a
// real browser exercises, and adversarially probes multi-block selections and
// the empty-item Enter escape hatch.

const bulletBtn = (page: Page): Locator =>
  page.locator('.editor-toolbar-modern button[aria-label="Bullet List"]').first()

const numberedBtn = (page: Page): Locator =>
  page
    .locator('.editor-toolbar-modern button[aria-label="Numbered List"]')
    .first()

const formatTrigger = (page: Page): Locator =>
  page.locator('.editor-toolbar-modern button[aria-label="Format"]').first()

/** Clear the editor and leave the caret ready for typing. */
async function resetEditor(page: Page): Promise<Locator> {
  const editor = page.locator('.editor-content')
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  return editor
}

/** Open the Format dropdown and pick a heading by its exact aria-label. */
async function applyHeadingToSelection(page: Page, label: string) {
  await formatTrigger(page).click()
  const menu = page.locator('.dropdown-menu')
  await expect(menu).toBeVisible()
  await menu.locator(`button[aria-label="${label}"]`).click()
}

test.describe('Lists & nesting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?empty=true')
    await page.waitForSelector('.editor-content')
  })

  test('creates a bullet list from a single line', async ({ page }) => {
    const editor = await resetEditor(page)
    await editor.pressSequentially('Solo item')

    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()

    await expect(editor.locator('ul')).toHaveCount(1)
    await expect(editor.locator('li')).toHaveCount(1)
    await expect(editor.locator('li').filter({ hasText: 'Solo item' })).toBeVisible()
  })

  test('wraps multiple selected lines into ONE list with one <li> per line', async ({
    page,
  }) => {
    const editor = await resetEditor(page)
    // Build three real paragraph blocks via the editor's own Enter handler.
    await editor.pressSequentially('Alpha')
    await page.keyboard.press('Enter')
    await editor.pressSequentially('Bravo')
    await page.keyboard.press('Enter')
    await editor.pressSequentially('Charlie')

    // Sanity: three separate blocks before we wrap them.
    await expect(editor.locator('p')).toHaveCount(3)

    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()

    // One list, three items, original order preserved, no stray paragraphs.
    await expect(editor.locator('ul')).toHaveCount(1)
    await expect(editor.locator('ul > li')).toHaveCount(3)
    await expect(editor.locator('p')).toHaveCount(0)

    const items = editor.locator('ul > li')
    await expect(items.nth(0)).toHaveText('Alpha')
    await expect(items.nth(1)).toHaveText('Bravo')
    await expect(items.nth(2)).toHaveText('Charlie')
  })

  test('toggling a single-item list OFF converts it back to a paragraph', async ({
    page,
  }) => {
    const editor = await resetEditor(page)
    await editor.pressSequentially('Toggle me')

    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()
    await expect(editor.locator('ul li')).toHaveText('Toggle me')

    // Collapse the caret inside the item, then toggle the same list type off.
    await editor.locator('li').click()
    await bulletBtn(page).click()

    await expect(editor.locator('ul')).toHaveCount(0)
    await expect(editor.locator('li')).toHaveCount(0)
    await expect(editor.locator('p').filter({ hasText: 'Toggle me' })).toBeVisible()
  })

  test('converts a bullet list to numbered and back by retagging in place (no nesting)', async ({
    page,
  }) => {
    const editor = await resetEditor(page)
    await editor.pressSequentially('Retag me')

    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()
    await expect(editor.locator('ul')).toHaveCount(1)

    // Bullet -> Numbered: the <ul> is retagged to <ol> in place, not nested.
    await editor.locator('li').click()
    await numberedBtn(page).click()
    await expect(editor.locator('ol')).toHaveCount(1)
    await expect(editor.locator('ul')).toHaveCount(0)
    await expect(editor.locator('li')).toHaveCount(1)
    await expect(editor.locator('ol > li')).toHaveText('Retag me')

    // Numbered -> Bullet: retag back the other direction.
    await editor.locator('li').click()
    await bulletBtn(page).click()
    await expect(editor.locator('ul')).toHaveCount(1)
    await expect(editor.locator('ol')).toHaveCount(0)
    await expect(editor.locator('ul > li')).toHaveText('Retag me')
  })

  test('Tab nests an item under its predecessor and Shift+Tab outdents it back', async ({
    page,
  }) => {
    const editor = await resetEditor(page)
    await editor.pressSequentially('First')
    await page.keyboard.press('Enter')
    await editor.pressSequentially('Second')

    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()
    await expect(editor.locator('ul > li')).toHaveCount(2)

    // Caret into the second item, then Tab to nest it under "First".
    await editor.locator('ul > li').nth(1).click()
    await page.keyboard.press('Tab')

    // A nested list now lives inside the first item, holding "Second".
    await expect(editor.locator('ul ul')).toHaveCount(1)
    await expect(editor.locator('ul ul > li')).toHaveText('Second')
    // The outer list is back down to a single direct child item.
    await expect(editor.locator('ul').first().locator('> li')).toHaveCount(1)

    // Shift+Tab from inside the nested item outdents it back to the top level.
    await editor.locator('ul ul > li').click()
    await page.keyboard.press('Shift+Tab')

    await expect(editor.locator('ul ul')).toHaveCount(0)
    await expect(editor.locator('ul > li')).toHaveCount(2)
    await expect(editor.locator('ul > li').nth(0)).toHaveText('First')
    await expect(editor.locator('ul > li').nth(1)).toHaveText('Second')
  })

  test('a list button applied to a heading turns the heading into a list item', async ({
    page,
  }) => {
    const editor = await resetEditor(page)
    await editor.pressSequentially('Head line')

    await page.keyboard.press('Control+A')
    await applyHeadingToSelection(page, 'Heading 1')
    await expect(editor.locator('h1')).toHaveText('Head line')

    // Caret inside the heading, then Bullet List.
    await editor.locator('h1').click()
    await bulletBtn(page).click()

    // Sane outcome: one list item carrying the text, heading tag gone.
    await expect(editor.locator('h1')).toHaveCount(0)
    await expect(editor.locator('ul')).toHaveCount(1)
    await expect(editor.locator('ul > li')).toHaveText('Head line')
  })

  test('PROBE: multi-block selection spanning a heading + paragraph collapses into one list', async ({
    page,
  }) => {
    const editor = await resetEditor(page)

    // Build a heading followed by a paragraph.
    await editor.pressSequentially('Chapter')
    await page.keyboard.press('Control+A')
    await applyHeadingToSelection(page, 'Heading 2')
    await expect(editor.locator('h2')).toHaveText('Chapter')

    await editor.locator('h2').click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await editor.pressSequentially('Prose body')
    await expect(editor.locator('h2')).toHaveCount(1)
    await expect(editor.locator('p')).toHaveCount(1)

    // Select both blocks and wrap them into a bullet list.
    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()

    await expect(editor.locator('ul')).toHaveCount(1)
    await expect(editor.locator('ul > li')).toHaveCount(2)
    await expect(editor.locator('h2')).toHaveCount(0)
    await expect(editor.locator('ul > li').nth(0)).toHaveText('Chapter')
    await expect(editor.locator('ul > li').nth(1)).toHaveText('Prose body')
  })

  test('PROBE: Enter on an empty trailing item exits the list into a paragraph', async ({
    page,
  }) => {
    const editor = await resetEditor(page)
    await editor.pressSequentially('Item one')

    await page.keyboard.press('Control+A')
    await bulletBtn(page).click()
    await expect(editor.locator('ul > li')).toHaveCount(1)

    // End of the item -> Enter (new empty item) -> Enter (escape the list).
    await editor.locator('li').click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')

    // The list keeps its single real item; a paragraph now follows the list.
    await expect(editor.locator('ul > li')).toHaveCount(1)
    await expect(editor.locator('ul > li')).toHaveText('Item one')
    await expect(editor.locator('ul + p')).toHaveCount(1)
  })
})
