import { test, expect, type Page } from "@playwright/test";

const openInsert = async (page: Page, item: string) => {
  await page.getByRole("button", { name: "Insert" }).first().click();
  await page
    .locator(".dropdown-menu")
    .getByRole("menuitem", { name: item, exact: true })
    .click();
};

test.describe("Insert menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("Link opens a styled modal (no native prompt) and inserts a link", async ({
    page,
  }) => {
    await page.locator(".editor-content").first().click();
    await openInsert(page, "Link");

    const modal = page.locator(".modal-content", { hasText: "Insert link" });
    await expect(modal).toBeVisible();

    await page.locator("#link-url").fill("example.com/docs");
    await page.locator("#link-text").fill("the docs");
    await page.getByRole("button", { name: "Insert link" }).click();

    const link = page.locator(".editor-content a").first();
    // bare domain is normalised to https://
    await expect(link).toHaveAttribute("href", "https://example.com/docs");
    await expect(link).toHaveText("the docs");
  });

  test("Link modal closes on Cancel without inserting", async ({ page }) => {
    await page.locator(".editor-content").first().click();
    await openInsert(page, "Link");
    await expect(
      page.locator(".modal-content", { hasText: "Insert link" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.locator(".modal-content", { hasText: "Insert link" })
    ).toBeHidden();
    await expect(page.locator(".editor-content a")).toHaveCount(0);
  });

  test("Horizontal Rule inserts an <hr>", async ({ page }) => {
    await page.locator(".editor-content").first().click();
    await openInsert(page, "Horizontal Rule");
    await expect(page.locator(".editor-content hr")).toHaveCount(1);
  });

  test("Emoji opens the emoji picker", async ({ page }) => {
    await openInsert(page, "Emoji");
    await expect(
      page.locator(".emoji-picker-overlay, [class*='emoji-picker']").first()
    ).toBeVisible();
  });

  const modalItems = ["Image", "Video", "Table", "Code Block", "File Manager"];
  for (const item of modalItems) {
    test(`${item} opens a dialog`, async ({ page }) => {
      await openInsert(page, item);
      await expect(
        page.locator(".modal-overlay, [role='dialog']").first()
      ).toBeVisible();
    });
  }
});
