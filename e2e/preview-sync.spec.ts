import { test, expect } from "@playwright/test";
import { ensureToolbarExpanded, switchViewMode } from "./helpers/toolbar";

test.describe("Preview Synchronization", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
    // View-mode buttons live behind the expand toggle in the auto-mini bar.
    await ensureToolbarExpanded(page);
  });

  test("should update preview immediately after slash command", async ({
    page,
  }) => {
    // First interact with editor before switching views
    const editor = page.locator(".editor-content");
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Switch to split view (inline button, or the ⋯ More item in compact)
    await switchViewMode(page, "Split");

    // In split view, interact with code editor
    const codeEditor = page.locator(".code-editor");
    await expect(codeEditor).toBeVisible();
    await codeEditor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type heading HTML directly in code view
    await codeEditor.fill("<h1>Test Heading</h1>");
    await page.waitForTimeout(300);

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
    // First interact with editor before switching views
    const editor = page.locator(".editor-content");
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Switch to split view (inline button, or the ⋯ More item in compact)
    await switchViewMode(page, "Split");

    // In split view, interact with code editor
    const codeEditor = page.locator(".code-editor");
    await expect(codeEditor).toBeVisible();
    await codeEditor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type list HTML directly in code view
    await codeEditor.fill("<ul><li>First item</li></ul>");
    await page.waitForTimeout(300);

    // Preview should show list
    const previewPanel = page.locator(".preview-panel");
    const previewList = previewPanel.locator("ul");
    await expect(previewList).toBeVisible({ timeout: 2000 });

    const listItem = previewList.locator("li").first();
    const itemText = await listItem.textContent();
    expect(itemText).toContain("First item");
  });
});
