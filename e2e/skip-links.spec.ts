import { test, expect } from '@playwright/test'

// Accessibility: the editor ships keyboard skip links (Skip to main content /
// toolbar / footer). Regression coverage for two real bugs fixed together:
//   1. The skip links pointed at ids (#main-content/#toolbar/#footer) that the
//      orchestrator never rendered, so every link hit the "target not found"
//      path and focus never moved — the feature was dead.
//   2. handleSkip() focused the landmark BEFORE making it focusable, so in a
//      real browser the programmatic focus no-op'd on first activation.
// happy-dom cannot verify real focus behaviour, so this lives at the e2e layer.
test.describe('Accessibility — skip links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?writingMode=false&empty=true')
    await page.waitForSelector('.editor-content')
  })

  test('every skip link resolves to a real landmark element (no dead links)', async ({
    page,
  }) => {
    const deadLinks = await page.evaluate(() => {
      const editor = document.querySelector('.next-level-editor')
      const links = Array.from(editor?.querySelectorAll('a.skip-link') ?? [])
      return links
        .map((a) => a.getAttribute('href') || '')
        .filter(
          (href) => !href.startsWith('#') || !document.getElementById(href.slice(1))
        )
    })
    expect(deadLinks).toEqual([])

    // And there are at least the three shipped defaults.
    const count = await page.locator('.next-level-editor a.skip-link').count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('activating "Skip to main content" moves focus into the editor region', async ({
    page,
  }) => {
    const skip = page
      .locator('.next-level-editor a.skip-link')
      .filter({ hasText: 'main content' })
    const href = await skip.getAttribute('href')
    await skip.focus()
    await page.keyboard.press('Enter')

    // The contract is "focus moves INTO the main region" — it may land on the
    // landmark itself or on the editing surface inside it (both are correct;
    // landing on the contenteditable is arguably the better outcome).
    const landedInMain = await page.evaluate((id) => {
      const target = document.getElementById(id)
      const active = document.activeElement
      return !!target && !!active && (active === target || target.contains(active))
    }, (href ?? '').slice(1))
    expect(landedInMain).toBe(true)
  })

  test('activating "Skip to toolbar" moves focus to the toolbar', async ({ page }) => {
    const skip = page
      .locator('.next-level-editor a.skip-link')
      .filter({ hasText: 'toolbar' })
    await skip.focus()
    await page.keyboard.press('Enter')

    const activeClass = await page.evaluate(
      () => document.activeElement?.className ?? ''
    )
    expect(activeClass).toContain('editor-toolbar-modern')
  })
})
