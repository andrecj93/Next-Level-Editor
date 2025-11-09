import { test, expect } from "@playwright/test";

test.describe("Color Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should auto-close after color selection", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Type some text
    await editor.pressSequentially("Color test");

    // Select all
    await page.keyboard.press("Control+A");

    // Open colors dropdown
    await page.click('button:has-text("Colors")');

    // Wait for dropdown to open
    await page.waitForTimeout(300);

    // Click a color (look for color buttons or swatches)
    const colorButton = page
      .locator(".color-swatch, .color-button, button[data-color]")
      .first();
    await colorButton.click();

    // Wait for auto-close (300ms + a bit extra)
    await page.waitForTimeout(500);

    // Colors dropdown should be closed
    const colorsDropdown = page.locator(
      ".colors-dropdown, .color-picker-dropdown"
    );
    await expect(colorsDropdown).not.toBeVisible();
  });
});
