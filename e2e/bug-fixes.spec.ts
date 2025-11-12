import { test, expect } from "@playwright/test";

test.describe("Next Level Editor - Bug Fixes", () => {
  test.beforeEach(async ({ page }) => {
    // Suppress HMR errors
    page.on("pageerror", (error) => {
      if (error.message.includes("Cannot read properties of undefined")) {
        return; // Ignore Vite HMR errors
      }
      throw error;
    });

    await page.goto("/?empty=true", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000); // Let HMR settle
    await page.waitForSelector(".editor-content", { timeout: 30000 });
  });

  test.describe("Auto-Save Timestamp", () => {
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

    test("should update timestamp after slash command usage", async ({
      page,
    }) => {
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

  test.describe("List Fragmentation with Slash Commands", () => {
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
  });

  test.describe("Visual Feedback for Slash Commands", () => {
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

  test.describe("Sticky Toolbar", () => {
    test("toolbar should remain visible when scrolling", async ({ page }) => {
      const editor = page.locator(".editor-content");
      await editor.click();

      // Add lots of content to enable scrolling
      for (let i = 0; i < 50; i++) {
        await editor.pressSequentially(`Paragraph ${i + 1}\n\n`);
        await page.waitForTimeout(30);
      }

      // Toolbar should be visible initially
      const toolbar = page.locator(".editor-toolbar-modern");
      await expect(toolbar).toBeVisible();

      // Scroll the editor content
      await page.evaluate(() => {
        const editorElement = document.querySelector(".editor-content");
        if (editorElement) {
          editorElement.scrollTop = 500;
        }
      });

      await page.waitForTimeout(300);

      // Toolbar should still be visible
      await expect(toolbar).toBeVisible();

      // Check that toolbar has sticky positioning
      const toolbarStyles = await toolbar.evaluate((el) => {
        const styles = globalThis.getComputedStyle(el);
        return {
          position: styles.position,
          top: styles.top,
        };
      });

      expect(toolbarStyles.position).toBe("sticky");
    });
  });

  test.describe("Preview Synchronization", () => {
    test("should update preview immediately after slash command", async ({
      page,
    }) => {
      const editor = page.locator(".editor-content");

      // Click on editor first to focus
      await editor.click();

      // Clear editor
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");
      await page.waitForTimeout(200);

      // Use slash command to create heading
      await page.keyboard.press("/");
      const commandMenu = page.locator(".command-menu");
      await expect(commandMenu).toBeVisible({ timeout: 2000 });

      const headingOption = commandMenu.locator("text=Heading 1").first();
      await headingOption.click();

      await editor.pressSequentially("Test Heading");
      await page.waitForTimeout(300);

      // Switch to split view to see preview
      const splitButton = page
        .locator('.view-mode-btn:has-text("Split")')
        .first();
      await splitButton.click();
      await page.waitForTimeout(500);

      // Check preview panel for the heading
      const previewPanel = page.locator(".preview-panel");
      await expect(previewPanel).toBeVisible();

      const previewHeading = previewPanel.locator("h1");
      await expect(previewHeading).toBeVisible({ timeout: 2000 });

      const previewText = await previewHeading.textContent();
      expect(previewText).toContain("Test Heading");
    });

    test("should update HTML output after list creation via slash command", async ({
      page,
    }) => {
      const editor = page.locator(".editor-content");

      // Click on editor first to focus
      await editor.click();

      // Clear
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");
      await page.waitForTimeout(200);

      // Create bullet list
      await page.keyboard.press("/");
      const commandMenu = page.locator(".command-menu");
      await expect(commandMenu).toBeVisible({ timeout: 2000 });

      const bulletOption = commandMenu.locator("text=Bullet List").first();
      await bulletOption.click();

      await editor.pressSequentially("First item");
      await page.waitForTimeout(300);

      // Switch to split view to see preview
      const splitButton = page
        .locator('.view-mode-btn:has-text("Split")')
        .first();
      await splitButton.click();
      await page.waitForTimeout(500);

      // Preview should show list
      const previewPanel = page.locator(".preview-panel");
      const previewList = previewPanel.locator("ul");
      await expect(previewList).toBeVisible({ timeout: 2000 });

      const listItem = previewList.locator("li").first();
      const itemText = await listItem.textContent();
      expect(itemText).toContain("First item");
    });
  });
});
