import { test, expect } from "@playwright/test";

/**
 * Responsive invariants for the demo site. These are viewport-driven, so they
 * run on the desktop (chromium) project only; the mobile-safari project pins a
 * device viewport that we don't want to fight with setViewportSize.
 */
test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "viewport-driven responsive checks run on chromium only"
  );
});

const views = [
  { name: "home", url: "/" },
  { name: "playground", url: "/?view=playground" },
  { name: "docs", url: "/?view=docs" },
];

const breakpoints = [
  { name: "mobile", w: 375, h: 812 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "desktop", w: 1280, h: 900 },
];

test.describe("Responsive layout", () => {
  for (const view of views) {
    for (const bp of breakpoints) {
      test(`${view.name} has no horizontal overflow at ${bp.name} (${bp.w}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: bp.w, height: bp.h });
        await page.goto(view.url, { waitUntil: "domcontentloaded" });
        // let the embedded editor + layout settle
        await page.waitForTimeout(700);

        const { scrollW, clientW } = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        }));

        expect(
          scrollW,
          `${view.name} @ ${bp.name}: page overflows horizontally (${scrollW} > ${clientW})`
        ).toBeLessThanOrEqual(clientW + 1);
      });
    }
  }

  test("nav collapses to a hamburger on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".menu-toggle")).toBeVisible();
    // the full inline links are not shown until the menu is opened
    await expect(page.locator(".nav-links")).not.toBeVisible();
    await page.locator(".menu-toggle").click();
    await expect(page.locator(".nav-links")).toBeVisible();
  });

  test("nav shows inline links and no hamburger on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".nav-links")).toBeVisible();
    await expect(page.locator(".menu-toggle")).not.toBeVisible();
  });

  test("docs TOC is hidden on mobile and shown on desktop", async ({ page }) => {
    await page.goto("/?view=docs", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator(".docs-toc")).not.toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator(".docs-toc")).toBeVisible();
  });

  test("nav touch targets are at least 40px tall on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const box = await page.locator(".menu-toggle").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });
});
