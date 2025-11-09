import { test, expect } from "@playwright/test";

test.describe("Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should show clear labels on export buttons", async ({ page }) => {
    // Check HTML export button
    const htmlButton = page.locator('button:has-text("HTML")');
    await expect(htmlButton).toBeVisible();

    // Check MD export button
    const mdButton = page.locator('button:has-text("MD")');
    await expect(mdButton).toBeVisible();

    // Check PDF export button
    const pdfButton = page.locator('button:has-text("PDF")');
    await expect(pdfButton).toBeVisible();

    // Check DOCX export button
    const docxButton = page.locator('button:has-text("DOCX")');
    await expect(docxButton).toBeVisible();
  });

  test("should have descriptive tooltips", async ({ page }) => {
    const htmlButton = page.locator('button:has-text("HTML")');
    await htmlButton.hover();

    // Tooltip should contain file extension info
    await expect(
      page.locator('[data-tooltip*=".html"], [title*=".html"]')
    ).toBeVisible({ timeout: 2000 });
  });
});
