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
      const editorElement = document.querySelector(".editor-content");
      if (editorElement) {
        editorElement.scrollTop = 500;
      }
    });

    await page.waitForTimeout(300);

    // Toolbar should still be visible
    await expect(toolbar).toBeVisible();

    // Check that the toolbar is pinned via sticky positioning. The sticky
    // lives on the toolbar's shell wrapper (.nle-toolbar-shell), which is
    // also the @container query context — a container query can't style its
    // own container, so the toolbar itself can't carry container-type.
    const stickyStyles = await toolbar.evaluate((el) => {
      const shell = el.closest(".nle-toolbar-shell") ?? el;
      const styles = globalThis.getComputedStyle(shell as Element);
      return {
        position: styles.position,
        top: styles.top,
      };
    });

    expect(stickyStyles.position).toBe("sticky");
    expect(stickyStyles.top).toBe("0px");
  });
});
