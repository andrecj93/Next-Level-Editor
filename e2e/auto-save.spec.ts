import { test, expect } from "@playwright/test";

test.describe("Auto-Save", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should update timestamp after content changes", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type initial content
    await editor.pressSequentially("First change");
    
    // Wait for auto-save to trigger (2s debounce)
    await page.waitForTimeout(2500);

    // Get the first timestamp
    const autoSaveIndicator = page.locator(".auto-save-indicator");
    const firstTimestamp = await autoSaveIndicator.textContent();
    
    // Wait a bit to ensure timestamps would be different
    await page.waitForTimeout(1000);

    // Make another change
    await editor.pressSequentially(" - Second change");
    
    // Wait for auto-save to trigger again
    await page.waitForTimeout(2500);

    // Get the second timestamp
    const secondTimestamp = await autoSaveIndicator.textContent();
    
    // Timestamps should be different
    expect(firstTimestamp).not.toBe(secondTimestamp);
  });

  test("should update timestamp after slash command usage", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type initial content and wait for auto-save
    await editor.pressSequentially("Initial text");
    await page.waitForTimeout(2500);

    const autoSaveIndicator = page.locator(".auto-save-indicator");
    const firstTimestamp = await autoSaveIndicator.textContent();
    
    // Wait to ensure different timestamp
    await page.waitForTimeout(1000);

    // Use slash command to create heading
    await page.keyboard.press("Enter");
    await page.keyboard.press("/");
    
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible({ timeout: 2000 });
    
    const headingOption = commandMenu.locator("text=Heading 2").first();
    await headingOption.click();
    
    await editor.pressSequentially("New heading");
    
    // Wait for auto-save
    await page.waitForTimeout(2500);
    
    const secondTimestamp = await autoSaveIndicator.textContent();
    expect(firstTimestamp).not.toBe(secondTimestamp);
  });
});
