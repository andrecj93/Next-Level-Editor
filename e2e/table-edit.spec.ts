import { test, expect, type Page } from '@playwright/test'

// Desktop editing UI (main toolbar + range selection + right-click). Mobile uses
// a different toolbar/selection model, so this runs on chromium only.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === 'mobile-safari',
    'desktop editing flow; mobile has its own UI'
  )
})

// Real-browser coverage for the table subsystem: Insert-menu -> Table modal ->
// a real <table>, typing into a cell, the right-click TableDesigner popover,
// and the Table Properties modal. Exercising the live contenteditable +
// selection + getComputedStyle paths surfaced two genuine product bugs (see the
// "documents BUG" tests below); assertions are pinned to the ACTUAL current
// behaviour so this spec stays green while flagging the defects.

const EDITOR = '.editor-content'

/** Open the desktop toolbar's Insert dropdown (scoped to avoid the mobile bar). */
async function openInsertMenu(page: Page) {
  const insertTrigger = page.locator(
    '.editor-toolbar-modern button[aria-label="Insert"]'
  )
  await expect(insertTrigger).toBeVisible()
  await insertTrigger.click()
  await expect(page.locator('.dropdown-menu').first()).toBeVisible()
}

/** Insert a table through the real UI and wait for the <table> to render. */
async function insertTable(
  page: Page,
  opts: { rows: number; cols: number; header: boolean }
) {
  const editor = page.locator(EDITOR)
  await editor.click()

  await openInsertMenu(page)
  // "Table" substring also matches "Table of Contents"/"Comfortable"; pin the
  // exact accessible name inside the dropdown menu.
  await page
    .locator('.dropdown-menu')
    .getByRole('button', { name: 'Table', exact: true })
    .click()

  const modal = page
    .locator('.modal-content')
    .filter({ has: page.getByRole('heading', { name: 'Insert Table' }) })
  await expect(modal).toBeVisible()

  await modal.locator('#table-rows').fill(String(opts.rows))
  await modal.locator('#table-cols').fill(String(opts.cols))

  const headerCheckbox = modal.locator('input[type="checkbox"]')
  if (opts.header) await headerCheckbox.check()
  else await headerCheckbox.uncheck()

  await modal.getByRole('button', { name: 'Insert Table', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(editor.locator('table')).toBeVisible()
}

/** Right-click a table cell to open the TableDesigner popover. */
async function openTableDesigner(page: Page) {
  const firstCell = page.locator(`${EDITOR} table td, ${EDITOR} table th`).first()
  // Left-click first so the selection (which getSelectedTable/Cell read) is
  // inside the cell, then right-click to raise the designer.
  await firstCell.click()
  await firstCell.click({ button: 'right' })
  await expect(page.locator('.table-designer')).toBeVisible()
}

/** Open the Table Properties modal from the designer; returns the modal locator. */
async function openTableProperties(page: Page) {
  await openTableDesigner(page)
  await page
    .locator('.table-designer')
    .getByRole('button', { name: 'Table Properties' })
    .click()
  const modal = page
    .locator('.modal-content')
    .filter({ has: page.getByRole('heading', { name: 'Table Properties' }) })
  await expect(modal).toBeVisible()
  return modal
}

/** Read the computed border of the first cell + background of the table. */
async function readTableStyle(page: Page) {
  return page.evaluate((sel) => {
    const table = document.querySelector<HTMLTableElement>(`${sel} table`)
    const cell = document.querySelector<HTMLElement>(
      `${sel} table td, ${sel} table th`
    )
    if (!table || !cell) return null
    const cs = getComputedStyle(cell)
    const ts = getComputedStyle(table)
    return {
      borderWidth: cs.borderTopWidth,
      borderStyle: cs.borderTopStyle,
      tableBackground: ts.backgroundColor,
    }
  }, EDITOR)
}

test.describe('Table editing + properties', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?empty=true')
    await page.waitForSelector(EDITOR)
    const editor = page.locator(EDITOR)
    await editor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
  })

  test('inserts a real <table> with the correct cell count (header row)', async ({
    page,
  }) => {
    const editor = page.locator(EDITOR)
    await insertTable(page, { rows: 3, cols: 3, header: true })

    await expect(editor.locator('table')).toHaveCount(1)
    // 3x3 with a header row: one <thead> row of 3 <th> + two body rows of 3 <td>.
    await expect(editor.locator('table th')).toHaveCount(3)
    await expect(editor.locator('table td')).toHaveCount(6)
    await expect(editor.locator('table th').first()).toContainText('Header 1')
  })

  test('inserts an all-body table when the header row is disabled', async ({
    page,
  }) => {
    const editor = page.locator(EDITOR)
    await insertTable(page, { rows: 3, cols: 4, header: false })

    // No header: 3 body rows x 4 cols = 12 <td>, and zero <th>.
    await expect(editor.locator('table th')).toHaveCount(0)
    await expect(editor.locator('table td')).toHaveCount(12)
  })

  test('typing into a cell writes text into that <td>', async ({ page }) => {
    const editor = page.locator(EDITOR)
    await insertTable(page, { rows: 2, cols: 2, header: false })

    const firstCell = editor.locator('table td').first()
    await firstCell.click()
    await editor.pressSequentially('Cell content here')

    await expect(
      editor.locator('table td').filter({ hasText: 'Cell content here' })
    ).toHaveCount(1)
    await expect(firstCell).toContainText('Cell content here')
  })

  test('right-click on the table opens the TableDesigner context menu', async ({
    page,
  }) => {
    await insertTable(page, { rows: 2, cols: 2, header: false })
    await openTableDesigner(page)

    const designer = page.locator('.table-designer')
    await expect(
      designer.getByRole('button', { name: 'Table Properties' })
    ).toBeVisible()
    await expect(
      designer.getByRole('button', { name: 'Cell Properties' })
    ).toBeVisible()
    await expect(
      designer.getByRole('button', { name: 'Delete Table' })
    ).toBeVisible()
  })

  test('Table Properties modal opens in table mode with the border fields', async ({
    page,
  }) => {
    await insertTable(page, { rows: 2, cols: 2, header: false })
    const modal = await openTableProperties(page)

    // Table tab is shown: Border Style select + Border Width number input, and
    // the width reflects the freshly-inserted 1px cells.
    await expect(modal.locator('select.select-input')).toBeVisible()
    await expect(modal.locator('input.number-input')).toHaveValue('1')
  })

  test('editing a Table Properties field then Apply persists the change', async ({
    page,
  }) => {
    await insertTable(page, { rows: 2, cols: 2, header: false })

    const before = await readTableStyle(page)
    expect(before?.borderWidth).toBe('1px')
    expect(before?.borderStyle).toBe('solid')

    const modal = await openTableProperties(page)
    // Edit the table's border width + style.
    await modal.locator('input.number-input').fill('5')
    await modal.locator('select.select-input').selectOption('dashed')
    await modal.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(modal).toBeHidden()

    // Apply captures the table/cell at modal-open, so the focus-steal that nulls
    // the live currentTable/currentCell no longer no-ops it: the edits stick.
    const after = await readTableStyle(page)
    expect(after?.borderWidth).toBe('5px')
    expect(after?.borderStyle).toBe('dashed')
  })

  test('a borderless (0px) table reads back as width 0 on reopen', async ({
    page,
  }) => {
    await insertTable(page, { rows: 2, cols: 2, header: false })

    // A genuinely borderless table (what a "border width 0" apply, or an
    // imported borderless table, produces).
    await page.evaluate((sel) => {
      document
        .querySelectorAll(`${sel} table td, ${sel} table th`)
        .forEach((c) => {
          ;(c as HTMLElement).style.border = '0px solid rgb(209, 213, 219)'
        })
    }, EDITOR)

    let modal = await openTableProperties(page)
    // getTableProperties now NaN-guards the parse instead of `|| 1`, so a
    // borderless table round-trips as 0 rather than collapsing to the default 1.
    await expect(modal.locator('input.number-input')).toHaveValue('0')
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(modal).toBeHidden()

    // Control: a non-zero width (6px) IS read back faithfully, confirming the
    // defect is specific to the 0 case and not a general read failure.
    await page.evaluate((sel) => {
      document
        .querySelectorAll(`${sel} table td, ${sel} table th`)
        .forEach((c) => {
          ;(c as HTMLElement).style.border = '6px solid rgb(209, 213, 219)'
        })
    }, EDITOR)

    modal = await openTableProperties(page)
    await expect(modal.locator('input.number-input')).toHaveValue('6')
  })

  test('probe: 1x1 table produces a single-cell table', async ({ page }) => {
    const editor = page.locator(EDITOR)
    await insertTable(page, { rows: 1, cols: 1, header: false })

    await expect(editor.locator('table')).toHaveCount(1)
    await expect(editor.locator('table td')).toHaveCount(1)
    await expect(editor.locator('table th')).toHaveCount(0)
  })
})
