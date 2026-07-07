import { test, expect } from "@playwright/test";

test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "Compact is a desktop density option; mobile has its own toolbar"
  );
});

test.describe("Compact toolbar layout", () => {
  test("collapses the toolbar to one dense row and keeps working", async ({
    page,
  }) => {
    await page.goto("/?view=playground");
    await page.waitForSelector(".editor-toolbar-modern");

    const toolbar = page.locator(".editor-toolbar-modern").first();
    const comfyHeight = (await toolbar.boundingBox())!.height;
    await expect(toolbar).not.toHaveClass(/is-compact/);

    // Switch to Compact via the playground density switcher.
    await page.locator(".pg-theme-chip", { hasText: /^Compact$/ }).click();
    await expect(toolbar).toHaveClass(/is-compact/);

    // One row instead of two → shorter.
    const compactHeight = (await toolbar.boundingBox())!.height;
    expect(compactHeight).toBeLessThan(comfyHeight);

    // Compact has no labels, so its icon tooltips are essential — the bar must
    // NOT create an overflow context, or the drop-down tooltips get clipped.
    const overflow = await toolbar.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.overflowX}/${s.overflowY}`;
    });
    expect(overflow).toBe("visible/visible");

    // Labels are hidden (icon-only) but the aria-labels + dropdowns still work.
    await page.getByRole("button", { name: "Insert" }).first().click();
    await expect(page.locator(".dropdown-menu")).toBeVisible();
  });

  test("tucks rarely-used tools into a ⋯ More menu that still works", async ({
    page,
  }) => {
    await page.goto("/?view=playground");
    await page.waitForSelector(".editor-toolbar-modern");
    await page.locator(".pg-theme-chip", { hasText: /^Compact$/ }).click();
    await expect(page.locator(".editor-toolbar-modern")).toHaveClass(
      /is-compact/
    );

    // The view-mode switch is no longer inline — it moved into "More".
    await expect(page.getByRole("button", { name: "Code view" })).toHaveCount(0);

    await page.getByRole("button", { name: "More" }).click();
    const menu = page.locator(".dropdown-menu");
    await expect(menu).toBeVisible();
    // ...and switching the mode from the menu still works.
    await menu.getByRole("button", { name: "Code view" }).click();
    await expect(page.locator(".editor-container")).toHaveClass(
      /view-mode-code/
    );
  });
});
