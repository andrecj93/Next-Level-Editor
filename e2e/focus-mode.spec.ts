import { test, expect } from "@playwright/test";

// In-page Focus mode: a distraction-free surface that fills the viewport
// WITHOUT the OS fullscreen takeover, leavable by button or Escape. Distinct
// from the real fullscreen button, which stays available separately.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "Focus mode lives on the desktop toolbar; mobile has its own chrome"
  );
});

test.describe("Focus mode (in-page, distraction-free)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?writingMode=false&empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("fills the viewport in-page and leaves on the button", async ({
    page,
  }) => {
    const root = page.locator(".next-level-editor");
    const focusBtn = page.locator(".editor-toolbar-modern .focus-toggle");
    const fullscreenBtn = page.locator(
      ".editor-toolbar-modern .fullscreen-toggle"
    );

    // Both controls exist and are distinct — Focus is not the OS fullscreen.
    await expect(focusBtn).toBeVisible();
    await expect(fullscreenBtn).toBeVisible();
    await expect(focusBtn).toHaveAttribute("aria-label", "Enter focus mode");
    await expect(root).not.toHaveClass(/is-focus/);

    await focusBtn.click();

    await expect(root).toHaveClass(/is-focus/);
    await expect(focusBtn).toHaveAttribute("aria-pressed", "true");
    await expect(focusBtn).toHaveAttribute("aria-label", "Exit focus mode");

    // It actually fills the viewport (no OS fullscreen was requested).
    const box = (await root.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.y)).toBe(0);
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);

    // The toolbar is still there and interactive inside focus mode.
    await expect(page.locator(".editor-toolbar-modern")).toBeVisible();

    // Clicking the button again leaves focus mode.
    await focusBtn.click();
    await expect(root).not.toHaveClass(/is-focus/);
    await expect(focusBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("Escape leaves focus mode", async ({ page }) => {
    const root = page.locator(".next-level-editor");
    const focusBtn = page.locator(".editor-toolbar-modern .focus-toggle");

    await focusBtn.click();
    await expect(root).toHaveClass(/is-focus/);

    await page.keyboard.press("Escape");
    await expect(root).not.toHaveClass(/is-focus/);
  });

  test("does NOT enter the OS fullscreen API (no document.fullscreenElement)", async ({
    page,
  }) => {
    const focusBtn = page.locator(".editor-toolbar-modern .focus-toggle");
    await focusBtn.click();
    await expect(page.locator(".next-level-editor")).toHaveClass(/is-focus/);

    const fsElement = await page.evaluate(() => !!document.fullscreenElement);
    expect(fsElement).toBe(false);
  });
});
