import { test, expect } from "@playwright/test";
import { ensureToolbarExpanded } from "./helpers/toolbar";

test.describe("File Manager Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true");

    // Wait for editor to load
    await page.waitForSelector(".editor-content");

    // Wait for toolbar to be fully ready
    await page.waitForTimeout(500);

    // On phone widths the toolbar auto-minifies; Insert is behind expand.
    await ensureToolbarExpanded(page);
  });

  test("should open file manager when clicking Insert → File Manager", async ({
    page,
  }) => {
    // Click Insert dropdown
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();

    // Wait for dropdown menu
    await page.waitForSelector(".dropdown-menu");

    // Click File Manager option
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator("dialog.file-manager-modal");
    await expect(modal).toBeVisible({ timeout: 2000 });
    await expect(modal).toContainText("File Manager");

    // Verify modal has toolbar
    await expect(page.locator('button:has-text("Upload Files")')).toBeVisible();

    // Verify modal has close button
    const closeButton = page.locator(
      'button.close-button, button:has-text("✕")'
    );
    await expect(closeButton).toBeVisible();
  });

  test("should close file manager when clicking close button", async ({
    page,
  }) => {
    // Open file manager
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();
    await page.waitForSelector(".dropdown-menu");
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Wait for modal
    const modal = page.locator("dialog.file-manager-modal");
    await expect(modal).toBeVisible({ timeout: 2000 });
    await expect(modal).toContainText("File Manager");

    // Click close button
    const closeButton = page.locator(
      'button.close-button, button:has-text("✕")'
    );
    await closeButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test("should allow file upload via click button", async ({ page }) => {
    // Open file manager
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();
    await page.waitForSelector(".dropdown-menu");
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Wait for upload button
    const uploadButton = page
      .locator("button")
      .filter({ hasText: /Upload Files/ });
    await expect(uploadButton).toBeVisible();

    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent("filechooser");

    // Click upload button
    await uploadButton.click();

    // Handle file chooser
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Test content"),
    });

    // Verify file appears in list (wait for it to be processed)
    await page.waitForTimeout(1000);

    // File should appear in the file manager
    const fileItem = page.locator("text=test.txt");
    await expect(fileItem).toBeVisible();
  });

  test("should allow drag and drop file upload", async ({ page }) => {
    // Open file manager
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();
    await page.waitForSelector(".dropdown-menu");
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Wait for drop zone or file container
    const dropZone = page.locator(".drop-zone, .file-container");
    await expect(dropZone).toBeVisible();

    // Create a data transfer
    await dropZone.dispatchEvent("dragover", {
      files: [
        {
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("Test content"),
        },
      ],
    });
  });

  test("should insert file into editor", async ({ page }) => {
    // Open file manager
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();
    await page.waitForSelector(".dropdown-menu");
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Wait for upload button
    const uploadButton = page
      .locator("button")
      .filter({ hasText: /Upload Files/ });
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Test content"),
    });

    // Wait for file to appear
    await page.waitForTimeout(1000);

    // Click insert button on file (or double-click the file card)
    const fileCard = page.locator('[class*="file-card"]').first();
    await fileCard.dblclick();

    // Modal should close
    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible();

    // File link or content should appear in editor
    const editor = page.locator('[contenteditable="true"]');
    await expect(editor).toContainText("test.txt");
  });

  test("should delete file from manager", async ({ page }) => {
    // Open file manager
    const insertButton = page
      .locator('button:has-text("Insert"), [data-tooltip*="Insert"]')
      .first();
    await insertButton.click();
    await page.waitForSelector(".dropdown-menu");
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Upload a file
    const uploadButton = page
      .locator("button")
      .filter({ hasText: /Upload Files/ });
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Test content"),
    });

    // Wait for file to appear
    await page.waitForTimeout(1000);

    // Verify file exists
    const fileItem = page
      .locator(".file-name", { hasText: "test.txt" })
      .first();
    await expect(fileItem).toBeVisible();

    // Setup dialog handler BEFORE clicking delete
    page.on("dialog", (dialog) => {
      dialog.accept();
    });

    // Find the file card containing test.txt and click its delete button
    const fileCard = page.locator(".file-card").filter({ hasText: "test.txt" });
    const deleteButton = fileCard.locator('button[title="Delete"]');
    await deleteButton.click({ force: true });

    // File should disappear
    await page.waitForTimeout(1000);
    await expect(fileItem).not.toBeVisible();
  });
});
