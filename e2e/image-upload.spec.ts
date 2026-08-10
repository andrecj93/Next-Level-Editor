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

test.describe("Image Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");
    await page.waitForSelector(".editor-content");
    // On phone widths the toolbar auto-minifies; Insert is behind expand.
    await ensureToolbarExpanded(page);
  });

  test("should show helpful hint when no image provided", async ({ page }) => {
    // Open Insert menu
    await page.click('button:has-text("Insert")');

    // Click Image
    await page.click('button:has-text("Image")');

    // Modal should appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Check for helpful hint
    const hint = page.locator("text=/Enter a URL or upload a file/");
    await expect(hint).toBeVisible();

    // Insert button should be disabled
    const insertButton = page.locator('button:has-text("Insert Image")');
    await expect(insertButton).toBeDisabled();
  });

  test("should enable Insert button when URL is provided", async ({ page }) => {
    // Open Insert menu
    await page.click('button:has-text("Insert")');

    // Click Image
    await page.click('button:has-text("Image")');

    // Enter URL
    const urlInput = page.locator(
      'input#image-url, input[placeholder*="example.com"]'
    );
    await urlInput.fill("https://example.com/image.jpg");

    // Wait a moment for validation
    await page.waitForTimeout(300);

    // Insert button should now be enabled
    const insertButton = page.locator('button:has-text("Insert Image")');
    await expect(insertButton).not.toBeDisabled();
  });

  test("should have checkmark icon on Insert button", async ({ page }) => {
    // Open Insert menu
    await page.click('button:has-text("Insert")');

    // Click Image
    await page.click('button:has-text("Image")');

    // Check for checkmark in button text
    const insertButton = page.locator('button:has-text("✓ Insert Image")');
    await expect(insertButton).toBeVisible();
  });
});
