import type { Page } from "@playwright/test";

/**
 * The main toolbar auto-compacts to a mini essentials row whenever its shell
 * is <= 640px wide (ResizeObserver-driven `effectiveToolbarLayout`), which is
 * the DEFAULT experience on phone viewports. Non-essential controls (Insert,
 * Colors, Size, undo/redo, theme toggle, ⋯ More) live behind the expand
 * toggle. Call this before interacting with any of them so specs exercise the
 * same flow a real phone user follows.
 */
export async function ensureToolbarExpanded(page: Page): Promise<void> {
  const expand = page.getByRole("button", { name: /Expand toolbar/i });
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    // Expanding plays the staged unfold (staggered opacity/translate on the
    // revealed groups, one-shot .is-unfolding class). Wait for it to SETTLE —
    // clicking a still-animating control trips Playwright's stability check,
    // which under full-suite webkit load can stretch into a flake.
    await page
      .waitForFunction(
        () => !document.querySelector(".editor-toolbar-modern.is-unfolding"),
        undefined,
        { timeout: 2000 }
      )
      .catch(() => {});
    await page.waitForTimeout(50);
  }
}

/**
 * Switch the editor view mode, resilient to toolbar density: in comfortable
 * layout the labelled `.view-mode-btn` buttons are inline; in compact (the
 * phone default) they move into the "⋯ More" overflow menu as
 * "<Mode> view" items.
 */
export async function switchViewMode(
  page: Page,
  mode: "Editor" | "Code" | "Split" | "Preview"
): Promise<void> {
  await ensureToolbarExpanded(page);
  const inline = page.locator(`.view-mode-btn:has-text("${mode}")`).first();
  if (await inline.isVisible().catch(() => false)) {
    await inline.click();
  } else {
    await page.getByRole("button", { name: "More" }).first().click();
    await page
      .locator(".dropdown-menu")
      .getByRole("menuitem", { name: `${mode} view` })
      .click();
  }
  await page.waitForTimeout(300);
}
