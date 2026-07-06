import { test, expect } from "@playwright/test";

test.describe("Table Insertion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("should show notification when table is inserted", async ({ page }) => {
    const editor = page.locator(".editor-content");
    await editor.click();

    // Open Insert dropdown or table modal
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();
    await page.waitForTimeout(200);

    // The "Table" item inside the open Insert menu. Scope + exact name so it
    // can't match other on-page text (e.g. the "Comfortable" density chip,
    // since has-text is case-insensitive: "comforTABLE").
    const tableOption = page
      .locator(".dropdown-menu")
      .getByRole("button", { name: "Table", exact: true });
    await tableOption.click();
    await page.waitForTimeout(300);

    // Modal should be visible with table configuration
    const tableModal = page.locator('.modal-content, [role="dialog"]');
    await expect(tableModal).toBeVisible({ timeout: 2000 });

    // Click Insert Table button
    const insertTableBtn = page.locator('button:has-text("Insert Table")');
    await insertTableBtn.click();

    // Toast notification should appear
    const toast = page.getByText(/Table.*inserted/i);
    await expect(toast).toBeVisible({ timeout: 2000 });

    // Table should be present in editor
    const table = editor.locator("table");
    await expect(table).toBeVisible({ timeout: 1000 });
  });
});
