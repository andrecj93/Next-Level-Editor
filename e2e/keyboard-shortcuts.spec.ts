import { test, expect } from "@playwright/test";

// Registry-backed advanced shortcuts + the help modal. Desktop toolbar flow
// (the Tools menu), so scope to chromium like the other toolbar specs.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "desktop toolbar/keyboard flow; mobile has its own UI"
  );
});

test.describe("Advanced keyboard shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  const typeAndSelectAll = async (page: import("@playwright/test").Page, text: string) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await editor.pressSequentially(text);
    await page.keyboard.press("Control+A");
    return editor;
  };

  test("Ctrl+Shift+X applies strikethrough (registry-only shortcut)", async ({
    page,
  }) => {
    const editor = await typeAndSelectAll(page, "strike me");
    await page.keyboard.press("Control+Shift+X");
    await expect(editor.locator("s, strike")).toHaveCount(1);
  });

  test("Ctrl+E applies inline code (registry-only shortcut)", async ({
    page,
  }) => {
    const editor = await typeAndSelectAll(page, "code me");
    await page.keyboard.press("Control+e");
    await expect(editor.locator("code")).toHaveCount(1);
  });

  test("Ctrl+B still applies bold exactly once (no double-fire)", async ({
    page,
  }) => {
    const editor = await typeAndSelectAll(page, "bold me");
    await page.keyboard.press("Control+b");
    // If both shortcut systems fired, bold would toggle on then off → 0.
    await expect(editor.locator("strong, b")).toHaveCount(1);
  });

  test("the help modal opens from Tools and lists only wired shortcuts", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Tools" }).first().click();
    await page
      .locator(".dropdown-menu")
      .getByRole("button", { name: "Keyboard Shortcuts" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Strikethrough")).toBeVisible();
    // Unwired registry entries must not be advertised.
    await expect(dialog.getByText("Zoom In", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Cut", { exact: true })).toHaveCount(0);
  });

  test("Ctrl+/ opens the help modal from the editor", async ({ page }) => {
    await page.locator(".editor-content").first().click();
    await page.keyboard.press("Control+/");
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
