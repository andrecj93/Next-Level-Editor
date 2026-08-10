import { test, expect, type Page } from '@playwright/test'

// Desktop editing UI (main toolbar + range selection). Mobile uses a different
// toolbar/selection model, so this runs on chromium only.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === 'mobile-safari',
    'desktop editing flow; mobile has its own UI'
  )
})

// Real-browser coverage for the Comments subsystem (enableComments is ON in the
// Playground). Exercises the full user flow through contenteditable + Range API:
//   select text -> floating "Comment" bubble -> CommentModal -> submit ->
//   inline highlight span + a thread card in the sidebar; reply; resolve
//   (moves to the Resolved tab); reopen; and multiple threads.
//
// Source under test: src/composables/useComments.ts,
// src/components/{FloatingToolbar,CommentModal,CommentsSidebar,CommentThreadCard,
// CommentReplyForm}.vue, wired in NextLevelEditor.vue.
//
// ── IMPORTANT (documents BUG, see the `bugs` report) ─────────────────────────
// The inline highlight <span class="comment-highlight" data-thread-id="…"> is
// injected straight into the contenteditable but is NOT part of the sanitized
// content model: useHtmlSanitizer only allows `style` on <span>, so it strips
// the `comment-highlight` class and `data-thread-id`. Whenever the editor
// re-syncs its content (useEditorContent.ts `applySanitizedContent`), the
// highlight's identifying markup is sanitized away and the inline anchor
// disappears — intermittently under load, deterministically on a v-model
// round-trip. The reactive thread model (sidebar) is unaffected. Therefore this
// spec verifies the highlight is CREATED at comment time (deterministic) and
// verifies the whole thread lifecycle through the STABLE sidebar model; it does
// NOT assert the inline highlight survives later interactions.

/**
 * Set a real DOM Range over the first occurrence of `needle` inside the editor.
 * Setting the selection fires a native `selectionchange`, which drives the
 * floating selection bubble to appear.
 */
async function selectSubstring(page: Page, needle: string): Promise<void> {
  const ok = await page.evaluate((needle) => {
    const editor = document.querySelector('.editor-content')
    if (!editor) return false
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? ''
      const idx = text.indexOf(needle)
      if (idx !== -1) {
        const range = document.createRange()
        range.setStart(node, idx)
        range.setEnd(node, idx + needle.length)
        const sel = window.getSelection()
        if (!sel) return false
        sel.removeAllRanges()
        sel.addRange(range)
        document.dispatchEvent(new Event('selectionchange'))
        return true
      }
    }
    return false
  }, needle)
  expect(ok, `could not find "${needle}" in the editor to select`).toBe(true)
}

/** Type fresh content into the empty playground editor. */
async function typeContent(page: Page, text: string): Promise<void> {
  const editor = page.locator('.editor-content')
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await editor.pressSequentially(text)
  await expect(editor).toContainText(text)
}

/**
 * Full add-comment flow: select `needle`, open the floating bubble, click its
 * Comment button, fill the modal, submit. Asserts the inline highlight is
 * created for the selection at submit time (before any re-sync can strip it),
 * then leaves the modal closed.
 */
async function addComment(
  page: Page,
  needle: string,
  body: string
): Promise<void> {
  await selectSubstring(page, needle)

  const commentBtn = page.locator(
    '.floating-toolbar button[aria-label="Comment"]'
  )
  await expect(commentBtn).toBeVisible()
  await commentBtn.click()

  const modal = page.locator('.comment-modal')
  await expect(modal).toBeVisible()
  // The modal echoes the selected text back to the author.
  await expect(modal.locator('.selected-text-content')).toContainText(needle)

  await modal.locator('textarea.comment-modal-textarea').fill(body)
  const submit = modal.locator('button.comment-modal-submit')
  await expect(submit).toBeEnabled()
  await submit.click()

  // Highlight is created synchronously on submit; poll passes on the first
  // read. (We do NOT assert it *survives* — see the file-header BUG note.)
  await expect
    .poll(
      () =>
        page.evaluate((needle) => {
          const els = Array.from(
            document.querySelectorAll('.editor-content span.comment-highlight')
          )
          return els.some(
            (e) =>
              e.textContent === needle && !!e.getAttribute('data-thread-id')
          )
        }, needle),
      { timeout: 5000, message: `highlight for "${needle}" should be created` }
    )
    .toBe(true)

  await expect(modal).toBeHidden()
}

const openTab = (page: Page) =>
  page.locator('.comments-tabs .comments-tab').first()
const resolvedTab = (page: Page) =>
  page.locator('.comments-tabs .comments-tab').nth(1)

test.describe('Comments — add / highlight / sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?empty=true')
    await page.waitForSelector('.editor-content')
  })

  test('selecting text and commenting creates a highlight + a sidebar thread', async ({
    page,
  }) => {
    await typeContent(page, 'Comment on this important sentence today.')

    // addComment asserts the inline highlight span is created at submit time.
    await addComment(page, 'important sentence', 'This needs a review pass')

    // Success feedback (asserted early — the toast auto-dismisses after ~3s).
    await expect(page.locator('.toast-notification.success')).toContainText(
      'Comment added successfully'
    )

    // Sidebar auto-opens and shows the new thread. The quoted text lives in the
    // reactive thread model, so it is a stable proxy for "this text is commented".
    await expect(
      page.locator('.comments-sidebar.comments-sidebar-open')
    ).toBeVisible()
    const card = page.locator('.comment-thread-card')
    await expect(card).toHaveCount(1)
    await expect(card.locator('.comment-quote-text')).toContainText(
      'important sentence'
    )
    await expect(card.locator('.comment-text').first()).toContainText(
      'This needs a review pass'
    )

    // Open count = 1, Resolved = 0.
    await expect(openTab(page).locator('.comments-tab-badge')).toHaveText('1')
    await expect(resolvedTab(page).locator('.comments-tab-badge')).toHaveText(
      '0'
    )
  })

  test('replying to a thread adds a second comment under it', async ({
    page,
  }) => {
    await typeContent(page, 'The quarterly figures look solid overall.')
    await addComment(page, 'quarterly figures', 'Can we double-check Q3?')

    const card = page.locator('.comment-thread-card')
    await expect(card).toHaveCount(1)

    // Open the reply form and submit a reply.
    await card.locator('.comment-add-reply-btn').click()
    const replyForm = card.locator('.comment-reply-form')
    await expect(replyForm).toBeVisible()
    await replyForm
      .locator('textarea.comment-reply-textarea')
      .fill('Confirmed with finance')
    const replyBtn = replyForm.locator('button.comment-reply-submit')
    await expect(replyBtn).toBeEnabled()
    await replyBtn.click()

    await expect(page.locator('.toast-notification.success')).toContainText(
      'Reply added successfully'
    )

    // The reply now shows in the thread's expanded replies section.
    const reply = card
      .locator('.comment-reply')
      .filter({ hasText: 'Confirmed with finance' })
    await expect(reply).toBeVisible()

    // Still a single OPEN thread (a reply is not a new thread).
    await expect(page.locator('.comment-thread-card')).toHaveCount(1)
    await expect(openTab(page).locator('.comments-tab-badge')).toHaveText('1')
  })

  test('resolving a thread moves it to the Resolved tab and updates counts', async ({
    page,
  }) => {
    await typeContent(page, 'Please tighten this paragraph before publishing.')
    await addComment(page, 'tighten this paragraph', 'Too wordy here')

    // Resolve it from the thread card.
    await page.getByRole('button', { name: 'Resolve thread' }).click()

    // Open tab empties out, Resolved tab gains one (reactive thread model).
    await expect(openTab(page).locator('.comments-tab-badge')).toHaveText('0')
    await expect(resolvedTab(page).locator('.comments-tab-badge')).toHaveText(
      '1'
    )

    // The Open tab (still active) now shows the empty state, no cards.
    await expect(page.locator('.comment-thread-card')).toHaveCount(0)
    await expect(page.locator('.comments-empty-text')).toBeVisible()

    // Switch to Resolved: the thread reappears with a Resolved badge.
    await resolvedTab(page).click()
    const card = page.locator('.comment-thread-card')
    await expect(card).toHaveCount(1)
    await expect(card.locator('.comment-status-badge')).toContainText('Resolved')
  })

  test('a resolved thread can be reopened back into the Open tab', async ({
    page,
  }) => {
    await typeContent(page, 'This introduction could use a stronger hook.')
    await addComment(page, 'stronger hook', 'Rework the opening line')

    // Resolve, then move to the Resolved tab where the reopen affordance lives.
    await page.getByRole('button', { name: 'Resolve thread' }).click()
    await resolvedTab(page).click()
    await expect(page.locator('.comment-thread-card')).toHaveCount(1)

    // Reopen it.
    await page.getByRole('button', { name: 'Reopen thread' }).click()

    // Counts flip back: Resolved -> 0, Open -> 1.
    await expect(resolvedTab(page).locator('.comments-tab-badge')).toHaveText(
      '0'
    )
    await expect(openTab(page).locator('.comments-tab-badge')).toHaveText('1')

    // Resolved tab (still active) is now empty; the thread lives under Open,
    // once again without a "Resolved" badge.
    await expect(page.locator('.comment-thread-card')).toHaveCount(0)
    await openTab(page).click()
    const card = page.locator('.comment-thread-card')
    await expect(card).toHaveCount(1)
    await expect(card.locator('.comment-status-badge')).toHaveCount(0)
  })

  test('a second comment produces a distinct thread', async ({ page }) => {
    // Two separate lines so the two selections never overlap.
    const editor = page.locator('.editor-content')
    await editor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await editor.pressSequentially('Alpha region needs a note.')
    await page.keyboard.press('Enter')
    await editor.pressSequentially('Beta region needs another note.')
    await expect(editor).toContainText('Alpha region')
    await expect(editor).toContainText('Beta region')

    // Each add asserts its own highlight is created at submit time.
    await addComment(page, 'Alpha region', 'First thread here')
    await addComment(page, 'Beta region', 'Second thread here')

    // Two independent, open threads (stable reactive model).
    const cards = page.locator('.comment-thread-card')
    await expect(cards).toHaveCount(2)
    await expect(openTab(page).locator('.comments-tab-badge')).toHaveText('2')

    // Each thread quotes only its own words.
    await expect(
      cards.locator('.comment-quote-text', { hasText: 'Alpha region' })
    ).toHaveCount(1)
    await expect(
      cards.locator('.comment-quote-text', { hasText: 'Beta region' })
    ).toHaveCount(1)
  })

  test('the sidebar "add comment" affordance rejects an empty selection', async ({
    page,
  }) => {
    // Open the comments sidebar via its toggle FAB (no selection made).
    await page
      .locator('.comments-toggle-fab[aria-label="Open comments"]')
      .click()
    await expect(
      page.locator('.comments-sidebar.comments-sidebar-open')
    ).toBeVisible()

    // The in-sidebar "Add new comment" FAB with nothing selected should be
    // rejected with an error toast and must NOT open the modal or create a thread.
    await page.locator('.comments-fab[aria-label="Add new comment"]').click()

    await expect(page.locator('.toast-notification.error')).toContainText(
      'Please select text to comment on'
    )
    await expect(page.locator('.comment-modal')).toBeHidden()
    await expect(page.locator('.comment-thread-card')).toHaveCount(0)
  })
})
