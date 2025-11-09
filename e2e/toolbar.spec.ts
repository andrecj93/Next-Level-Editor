import { test, expect } from "@playwright/test";

test.describe("Toolbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should remain visible when scrolling", async ({ page }) => {
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
      const editorElement = document.querySelector('.editor-content');
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
