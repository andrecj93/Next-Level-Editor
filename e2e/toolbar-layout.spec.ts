import { test, expect } from "@playwright/test";

test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "Compact is a desktop density option; mobile has its own toolbar"
  );
});

test.describe("Compact toolbar layout", () => {
  test("collapses to a mini essentials row and expands on demand", async ({
    page,
  }) => {
    await page.goto("/?writingMode=false&view=playground");
    await page.waitForSelector(".editor-toolbar-modern");

    const toolbar = page.locator(".editor-toolbar-modern").first();
    const comfyHeight = (await toolbar.boundingBox())!.height;
    await expect(toolbar).not.toHaveClass(/is-compact/);

    // Switch to Compact via the playground density switcher → the toolbar
    // collapses to a mini row of formatting essentials.
    await page.locator(".pg-theme-chip", { hasText: /^Compact$/ }).click();
    await expect(toolbar).toHaveClass(/is-compact/);
    await expect(toolbar).toHaveClass(/is-mini/);

    // Shorter than comfortable, and the essentials stay while the rest fold away.
    const miniHeight = (await toolbar.boundingBox())!.height;
    expect(miniHeight).toBeLessThan(comfyHeight);
    await expect(page.getByRole("button", { name: "Format" }).first()).toBeVisible();
    // Insert is an essential: it stays visible even in the collapsed mini row
    // (inserting links/images/tables is a top-3 action — hiding it behind the
    // expand toggle made the feature look absent on phones). Colours/Size/Tools
    // etc. are what fold away instead.
    const insert = page.getByRole("button", { name: "Insert" }).first();
    await expect(insert).toBeVisible();
    await expect(page.getByRole("button", { name: "Colors" }).first()).toBeHidden();

    // Mini has no labels, so its icon tooltips are essential — the bar must
    // NOT become an overflow context, or the drop-down tooltips get clipped.
    const overflow = await toolbar.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.overflowX}/${s.overflowY}`;
    });
    expect(overflow).toBe("visible/visible");

    // The expand toggle reveals the full toolbar…
    await page.getByRole("button", { name: /Expand toolbar/i }).click();
    await expect(toolbar).not.toHaveClass(/is-mini/);
    await expect(insert).toBeVisible();

    // …and the dropdowns still work.
    await insert.click();
    await expect(page.locator(".dropdown-menu")).toBeVisible();
  });

  test("tucks rarely-used tools into a ⋯ More menu that still works", async ({
    page,
  }) => {
    await page.goto("/?writingMode=false&view=playground");
    await page.waitForSelector(".editor-toolbar-modern");
    await page.locator(".pg-theme-chip", { hasText: /^Compact$/ }).click();
    await expect(page.locator(".editor-toolbar-modern")).toHaveClass(
      /is-compact/
    );

    // Expand the mini bar so the overflow tools (incl. "⋯ More") are reachable.
    await page.getByRole("button", { name: /Expand toolbar/i }).click();

    // The view-mode switch is no longer inline — it moved into "More".
    await expect(page.getByRole("button", { name: "Code view" })).toHaveCount(0);

    await page.getByRole("button", { name: "More" }).click();
    const menu = page.locator(".dropdown-menu");
    await expect(menu).toBeVisible();
    // ...and switching the mode from the menu still works.
    await menu.getByRole("menuitem", { name: "Code view" }).click();
    await expect(page.locator(".editor-container")).toHaveClass(
      /view-mode-code/
    );
  });
});

test("top, left and bottom toolbar menus fit without widening the page", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await page.goto("/?writingMode=false&empty=true&view=playground");
  const assertPageWidth = async () => {
    const size = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(size.content, JSON.stringify(size)).toBeLessThanOrEqual(size.width + 1);
  };

  for (const position of ["top", "left", "bottom"]) {
    await page.getByRole("button", { name: "Configure", exact: true }).click();
    await page.getByLabel("Toolbar position", { exact: true }).selectOption(position);
    await page.getByRole("button", { name: "Close configuration", exact: true }).click();
    const shell = page.locator(".nle-toolbar-shell");
    if (position === "top") await expect(shell).not.toHaveAttribute("data-position");
    else await expect(shell).toHaveAttribute("data-position", position);

    // Export is anchored to the opposite edge; the collapsed left rail only
    // exposes Format, so cover that rail's flyout without changing its layout.
    for (const label of position === "left" ? ["Format"] : ["Format", "Export"]) {
      await page.getByRole("button", { name: label, exact: true }).first().click();
      const menu = page.getByRole("menu", { name: label, exact: true });
      await expect(menu).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
        .map(animation => animation.finished.catch(() => undefined))));
      const box = (await menu.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(900);
      expect(box.y + box.height).toBeLessThanOrEqual(600);
      await assertPageWidth();
      await menu.press("Escape");
      await assertPageWidth();
      await expect(menu).not.toBeVisible();
    }
  }
});
