import { test, expect } from "@playwright/test";

/**
 * The consumer-facing usage options: readonly, showToolbar, defaultViewMode,
 * autofocus. Driven through the playground's Configure panel where possible;
 * readonly/showToolbar/autofocus are exercised via query params the playground
 * understands, falling back to DOM assertions on the editor itself.
 */

test.describe("Editor usage options", () => {
  test("readonly: content is shown but not editable and the toolbars are hidden", async ({
    page,
  }) => {
    await page.goto("/?view=playground&readonly=1");
    await page.waitForSelector(".editor-content");

    const surface = page.locator(".editor-content").first();
    await expect(surface).toHaveAttribute("contenteditable", "false");
    // Main toolbar is gone…
    await expect(page.locator(".editor-toolbar-modern")).toHaveCount(0);

    // …and typing changes nothing.
    const before = await surface.innerHTML();
    await surface.click();
    await page.keyboard.type("this should not appear");
    await expect(surface).toHaveJSProperty("innerHTML", before);

    // No selection toolbar bubble on selecting readonly text.
    await surface.click({ clickCount: 3 });
    await page.waitForTimeout(300);
    const bubbles = await page.evaluate(
      () =>
        [...document.querySelectorAll(".floating-toolbar")].filter(
          (e) => (e as HTMLElement).getBoundingClientRect().width > 0
        ).length
    );
    expect(bubbles).toBe(0);
  });

  test("showToolbar=false: no main toolbar, but the editor still edits", async ({
    page,
  }) => {
    await page.goto("/?view=playground&hideToolbar=1");
    await page.waitForSelector(".editor-content");

    await expect(page.locator(".editor-toolbar-modern")).toHaveCount(0);

    const surface = page.locator(".editor-content").first();
    await surface.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("headless typing works");
    await expect(surface).toContainText("headless typing works");
  });

  test("defaultViewMode=code opens in the code view", async ({ page }) => {
    await page.goto("/?view=playground&editorView=code");
    await page.waitForSelector(".editor-container");
    await expect(page.locator(".code-editor")).toBeVisible();
  });

  test("autofocus places the caret in the editor on mount", async ({
    page,
  }) => {
    await page.goto("/?view=playground&autofocus=1");
    await page.waitForSelector(".editor-content");
    const focusedIsEditor = await page.evaluate(() =>
      document.activeElement?.classList.contains("editor-content")
    );
    expect(focusedIsEditor).toBe(true);
  });
});
