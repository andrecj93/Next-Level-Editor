import { test, expect } from "@playwright/test";

test.describe("Undo/Redo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should support Ctrl+Y for redo", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    // Type some text
    await editor.pressSequentially("Hello World");
    await page.waitForTimeout(100);

    // Undo (Ctrl+Z)
    await page.keyboard.press("Control+Z");
    await page.waitForTimeout(100);

    const afterUndo = await editor.textContent();
    expect(afterUndo?.trim()).not.toContain("Hello World");

    // Redo with Ctrl+Y
    await page.keyboard.press("Control+Y");
    await page.waitForTimeout(100);

    const afterRedo = await editor.textContent();
    expect(afterRedo?.trim()).toContain("Hello World");
  });

  test("should support Ctrl+Shift+Z for redo", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    // Type some text
    await editor.pressSequentially("Test Content");
    await page.waitForTimeout(100);

    // Undo
    await page.keyboard.press("Control+Z");
    await page.waitForTimeout(100);

    // Redo with Ctrl+Shift+Z
    await page.keyboard.press("Control+Shift+Z");
    await page.waitForTimeout(100);

    const afterRedo = await editor.textContent();
    expect(afterRedo?.trim()).toContain("Test Content");
  });
});
