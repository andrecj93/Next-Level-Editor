import { test, expect } from "@playwright/test";

test.describe("Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("collapses every format into one clearly-labelled Export menu", async ({
    page,
  }) => {
    // The four cryptic file-badges are gone — exports live behind one menu.
    const trigger = page.getByRole("button", { name: "Export" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const menu = page.locator(".dropdown-menu");
    await expect(menu.getByRole("button", { name: "HTML" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Markdown" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "PDF" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Word" })).toBeVisible();
  });

  test("shows the target file extension next to each format", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Export" }).click();

    const menu = page.locator(".dropdown-menu");
    await expect(menu).toContainText(".html");
    await expect(menu).toContainText(".md");
    await expect(menu).toContainText(".pdf");
    await expect(menu).toContainText(".docx");
  });
});
