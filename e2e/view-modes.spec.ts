import { test, expect } from "@playwright/test";

test.describe("View Modes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should show text labels on view mode buttons", async ({ page }) => {
    // Check Editor button label
    const editorButton = page.locator('.view-mode-btn:has-text("Editor")');
    await expect(editorButton).toBeVisible();

    // Check Code button label
    const codeButton = page.locator('.view-mode-btn:has-text("Code")');
    await expect(codeButton).toBeVisible();

    // Check Split button label
    const splitButton = page.locator('.view-mode-btn:has-text("Split")');
    await expect(splitButton).toBeVisible();

    // Check Preview button label
    const previewButton = page.locator('.view-mode-btn:has-text("Preview")');
    await expect(previewButton).toBeVisible();
  });

  test("should switch between Editor and Code view", async ({ page }) => {
    // Check Editor view is initially visible
    const editorPanel = page
      .locator(".view-mode-editor .editor-content")
      .first();
    await expect(editorPanel).toBeVisible();

    // Click Code view button
    const codeButton = page
      .locator('.view-mode-btn:has-text("Code")')
      .first();
    await codeButton.click();

    // Wait for view mode to change
    await page.waitForTimeout(500);

    // Should show code view (textarea or code editor)
    const codeView = page.locator(".code-editor");
    await expect(codeView).toBeVisible({ timeout: 2000 });

    // Check that container has view-mode-code class
    const container = page.locator(".editor-container.view-mode-code");
    await expect(container).toBeVisible();

    // Click back to Editor view
    const editorButton = page
      .locator('.view-mode-btn:has-text("Editor")')
      .first();
    await editorButton.click();

    await page.waitForTimeout(500);

    // Check that container has view-mode-editor class
    const editorContainer = page.locator(
      ".editor-container.view-mode-editor"
    );
    await expect(editorContainer).toBeVisible();

    // Editor content should be visible again
    const editorContentAgain = page
      .locator(".view-mode-editor .editor-content")
      .first();
    await expect(editorContentAgain).toBeVisible();
  });
});
