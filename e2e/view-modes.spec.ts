import { test, expect } from "@playwright/test";
import { ensureToolbarExpanded, switchViewMode } from "./helpers/toolbar";

// Exercises the DESKTOP toolbar/modals, which webkit on the GitHub runner
// intermittently hangs (not reproducible locally). Runs on chromium only, like
// responsive.spec; the mobile editor uses its own toolbar/affordances.
test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "desktop toolbar/modal flow; mobile has its own UI"
  );
});

test.describe("View Modes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
    // View-mode buttons live behind the expand toggle in the auto-mini bar.
    await ensureToolbarExpanded(page);
  });

  test("should show text labels on view mode buttons", async ({ page }) => {
    const inlineEditorBtn = page.locator('.view-mode-btn:has-text("Editor")');
    if (await inlineEditorBtn.isVisible().catch(() => false)) {
      // Comfortable layout: the four labelled buttons are inline.
      await expect(inlineEditorBtn).toBeVisible();
      await expect(
        page.locator('.view-mode-btn:has-text("Code")')
      ).toBeVisible();
      await expect(
        page.locator('.view-mode-btn:has-text("Split")')
      ).toBeVisible();
      await expect(
        page.locator('.view-mode-btn:has-text("Preview")')
      ).toBeVisible();
    } else {
      // Compact (phone default): the switch lives in the "⋯ More" menu as
      // labelled "<Mode> view" items.
      await page.getByRole("button", { name: "More" }).first().click();
      const menu = page.locator(".dropdown-menu");
      for (const mode of ["Editor", "Code", "Split", "Preview"]) {
        await expect(
          menu.getByRole("menuitem", { name: `${mode} view` })
        ).toBeVisible();
      }
    }
  });

  test("should switch between Editor and Code view", async ({ page }) => {
    // Check Editor view is initially visible
    const editorPanel = page
      .locator(".view-mode-editor .editor-content")
      .first();
    await expect(editorPanel).toBeVisible();

    // Switch to Code view (inline button, or the ⋯ More item in compact)
    await switchViewMode(page, "Code");

    // Should show code view (textarea or code editor)
    const codeView = page.locator(".code-editor");
    await expect(codeView).toBeVisible({ timeout: 2000 });

    // Check that container has view-mode-code class
    const container = page.locator(".editor-container.view-mode-code");
    await expect(container).toBeVisible();

    // Switch back to Editor view
    await switchViewMode(page, "Editor");

    // Check that container has view-mode-editor class
    const editorContainer = page.locator(".editor-container.view-mode-editor");
    await expect(editorContainer).toBeVisible();

    // Editor content should be visible again
    const editorContentAgain = page
      .locator(".view-mode-editor .editor-content")
      .first();
    await expect(editorContentAgain).toBeVisible();
  });
});
