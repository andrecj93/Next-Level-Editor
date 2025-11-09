import { test, expect } from "@playwright/test";

test.describe("Slash Commands", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should not fragment list items when converting to heading", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Create a bullet list first
    await page.keyboard.press("/");
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible({ timeout: 2000 });

    const bulletOption = commandMenu.locator("text=Bullet List").first();
    await bulletOption.click();
    await page.waitForTimeout(300);

    // Type list item content
    const testText = "Complete list item with features, benefits and details";
    await editor.pressSequentially(testText);
    await page.waitForTimeout(300);

    // Now convert the list item to a heading using slash command
    await page.keyboard.press("Home"); // Go to beginning of line
    await page.keyboard.press("/");

    await expect(commandMenu).toBeVisible({ timeout: 2000 });
    const headingOption = commandMenu.locator("text=Heading 2").first();
    await headingOption.click();

    await page.waitForTimeout(500);

    // Check that text is not fragmented
    const editorText = await editor.textContent();

    // The text should remain complete and not be split
    expect(editorText).toContain("Complete list item");
    expect(editorText).toContain("features");
    expect(editorText).toContain("benefits");
    expect(editorText).toContain("details");

    // Should have a heading now (not a list)
    const heading = editor.locator("h2");
    await expect(heading).toBeVisible();

    // The converted item should not be in a list anymore
    const headingText = await heading.textContent();
    expect(headingText).toContain("features");
  });

  test("should unnest list item when converting to paragraph", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear and create a list
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    await page.keyboard.press("/");
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible({ timeout: 2000 });

    const bulletOption = commandMenu.locator("text=Bullet List").first();
    await bulletOption.click();

    await editor.pressSequentially("List item to convert");
    await page.waitForTimeout(300);

    // Convert to paragraph
    await page.keyboard.press("Home");
    await page.keyboard.press("/");

    await expect(commandMenu).toBeVisible({ timeout: 2000 });
    const paragraphOption = commandMenu.locator("text=Paragraph").first();
    await paragraphOption.click();

    await page.waitForTimeout(500);

    // Should now be a paragraph, not a list item
    const paragraph = editor.locator("p");
    await expect(paragraph).toBeVisible();

    const paragraphText = await paragraph.textContent();
    expect(paragraphText).toContain("List item to convert");
  });

  test("should show toast notification after slash command", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Use slash command
    await page.keyboard.press("/");
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible({ timeout: 2000 });

    const headingOption = commandMenu.locator("text=Heading 1").first();
    await headingOption.click();

    // Toast should appear
    const toast = page.locator(".toast-notification");
    await expect(toast).toBeVisible({ timeout: 2000 });

    // Toast should contain success message about the action
    const toastText = await toast.textContent();
    expect(toastText).toContain("Heading 1");
  });

  test("should scroll to element after slash command", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Add enough content to make scrolling necessary
    for (let i = 0; i < 20; i++) {
      await editor.pressSequentially(`Line ${i + 1}\n`);
      await page.waitForTimeout(50);
    }

    // Scroll to top
    await page.evaluate(() => {
      const editorElement = document.querySelector(".editor-content");
      if (editorElement) {
        editorElement.scrollTop = 0;
      }
    });

    // Go to bottom of content
    await page.keyboard.press("Control+End");
    await page.waitForTimeout(200);

    // Use slash command at bottom
    await page.keyboard.press("/");
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible({ timeout: 2000 });

    const headingOption = commandMenu.locator("text=Heading 2").first();
    await headingOption.click();

    await page.waitForTimeout(500);

    // Check that the new element is visible (scrolled into view)
    const heading = editor.locator("h2").last();
    await expect(heading).toBeVisible();
  });
});
