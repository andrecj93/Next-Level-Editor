import { test, expect } from "@playwright/test";
import { ensureToolbarExpanded } from "./helpers/toolbar";

// Exercises the DESKTOP toolbar/modals, which webkit on the GitHub runner
// intermittently hangs (not reproducible locally). Runs on chromium only, like
// responsive.spec; the mobile editor uses its own toolbar/affordances.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "desktop toolbar/modal flow; mobile has its own UI"
  );
});

test.describe("Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
    // Export lives behind the expand toggle in the auto-mini phone toolbar.
    await ensureToolbarExpanded(page);
  });

  test("collapses every format into one clearly-labelled Export menu", async ({
    page,
  }) => {
    // The four cryptic file-badges are gone — exports live behind one menu.
    const trigger = page.getByRole("button", { name: "Export" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const menu = page.locator(".dropdown-menu");
    await expect(menu.getByRole("menuitem", { name: "HTML" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Markdown" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "PDF" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Word" })).toBeVisible();
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
