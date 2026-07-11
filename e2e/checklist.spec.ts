import { test, expect } from "@playwright/test";

// The checklist is a plain contenteditable interaction (markdown shortcut +
// gutter click), no desktop-only toolbar/modal, so it runs on both projects.
test.describe("Checklist block", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
  });

  test("the '[] ' shortcut creates a sanitizer-safe checklist item", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.type("[] Buy milk");

    const item = editor.locator("ul.checklist > li");
    await expect(item).toHaveAttribute("data-checked", "false");
    await expect(item).toHaveText("Buy milk");
    // Never nested inside a <p> (that would corrupt on the next round-trip).
    await expect(editor.locator("p ul")).toHaveCount(0);
  });

  test("'[x] ' starts checked", async ({ page }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.type("[x] Done");
    await expect(editor.locator("ul.checklist > li")).toHaveAttribute(
      "data-checked",
      "true"
    );
  });

  test("clicking the checkbox gutter toggles; clicking the label does not", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.type("[] Task");
    const item = editor.locator("ul.checklist > li");

    // Click the left gutter (the checkbox) → toggles to checked.
    const box = await item.boundingBox();
    await page.mouse.click(box!.x + 8, box!.y + box!.height / 2);
    await expect(item).toHaveAttribute("data-checked", "true");

    // Click the label text → stays checked (caret placement, no toggle).
    await page.mouse.click(box!.x + box!.width - 12, box!.y + box!.height / 2);
    await expect(item).toHaveAttribute("data-checked", "true");
  });

  test("checked state survives a code-view round-trip", async ({ page }) => {
    test.skip(
      test.info().project.name === "mobile-safari",
      "code view toggle lives on the desktop toolbar"
    );
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.type("[x] Persist me");
    await expect(editor.locator("ul.checklist > li")).toHaveAttribute(
      "data-checked",
      "true"
    );

    // Toggle to Code view and back — the sanitizer runs on the way back.
    await page.getByRole("button", { name: "Code view" }).click();
    await page.getByRole("button", { name: "Editor view" }).click();

    const item = page.locator(".editor-content ul.checklist > li").first();
    await expect(item).toHaveAttribute("data-checked", "true");
    await expect(item).toHaveText("Persist me");
  });
});
