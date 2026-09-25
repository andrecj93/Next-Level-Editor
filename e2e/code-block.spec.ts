import { test, expect, type Page } from "@playwright/test";

/**
 * The code-block modal had NO real browser coverage — the insert-features
 * spec only asserted that "Code Block" appears in the Insert menu; nothing
 * ever opened it. That gap mattered once batch 154 moved Prism and its 21
 * grammars into a lazily-imported chunk to get them out of the library's
 * eager bundle: under happy-dom a dynamic import resolves through vitest's
 * module graph, which is nothing like a real chunk fetched over HTTP. These
 * tests exercise that path where it actually has to work.
 */
const openCodeBlockModal = async (page: Page) => {
  await page.getByRole("button", { name: "Insert" }).first().click();
  await page
    .locator(".dropdown-menu")
    .getByRole("menuitem", { name: "Code Block", exact: true })
    .click();
  const modal = page.locator(".modal-content.code-block-modal");
  await expect(modal).toBeVisible();
  return modal;
};

test.describe("Code block", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
    await page.locator(".editor-content").first().click();
  });

  test("the lazily-loaded highlighter arrives and colours the preview", async ({
    page,
  }) => {
    const modal = await openCodeBlockModal(page);
    await modal.locator("#language-select").selectOption("javascript");
    await modal.locator("#code-input").fill("const answer = 42");

    // Prism's chunk is fetched only now; `token` spans are proof it landed.
    await expect(
      modal.locator(".code-preview .token").first()
    ).toBeVisible();
    await expect(modal.locator(".code-preview")).toContainText("const");
  });

  test("re-highlights when the language changes", async ({ page }) => {
    const modal = await openCodeBlockModal(page);
    await modal.locator("#code-input").fill("SELECT * FROM users");

    await modal.locator("#language-select").selectOption("sql");
    await expect(modal.locator(".code-preview .token").first()).toBeVisible();
    // A grammar that only registers because prismHighlighter imports it.
    await expect(
      modal.locator(".code-preview .token.keyword").first()
    ).toBeVisible();
  });

  test("the preview never renders typed markup as live HTML", async ({
    page,
  }) => {
    const modal = await openCodeBlockModal(page);
    await modal.locator("#code-input").fill('<img src=x onerror="alert(1)">');
    await expect(modal.locator(".code-preview")).toContainText("img src=x");

    // The payload must be TEXT in the preview, never an element.
    await expect(modal.locator(".code-preview img")).toHaveCount(0);
  });

  test("inserts a real <pre><code> block carrying the raw source", async ({
    page,
  }) => {
    const modal = await openCodeBlockModal(page);
    await modal.locator("#language-select").selectOption("javascript");
    await modal.locator("#code-input").fill("if (a < b && c > d) run()");
    await modal.getByRole("button", { name: "Insert Code" }).click();
    await expect(modal).toBeHidden();

    const block = page.locator(".editor-content pre").first();
    await expect(block).toBeVisible();
    // The document keeps the SOURCE, not the escaped preview markup.
    await expect(block).toContainText("if (a < b && c > d) run()");
    await expect(page.locator(".editor-content pre img")).toHaveCount(0);
  });

  test("Cancel closes without inserting anything", async ({ page }) => {
    const modal = await openCodeBlockModal(page);
    await modal.locator("#code-input").fill("throwaway");
    await modal.getByRole("button", { name: "Cancel" }).click();

    await expect(modal).toBeHidden();
    await expect(page.locator(".editor-content pre")).toHaveCount(0);
  });
});
