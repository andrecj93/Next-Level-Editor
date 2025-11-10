import { test, expect } from "@playwright/test";

test.describe("File Manager Modal", () => {
  test("should open file manager when clicking Insert → File Manager", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/");

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Click Insert dropdown
    const insertButton = page.locator("button").filter({ hasText: /^Insert$/ });
    await insertButton.click();

    // Wait for dropdown menu
    await page.waitForSelector(".dropdown-menu");

    // Click File Manager option
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Verify modal is visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toContainText("File Manager");

    // Verify modal has toolbar
    await expect(page.locator('button:has-text("Upload Files")')).toBeVisible();

    // Verify modal has close button
    const closeButton = page.locator('button:has-text("×")');
    await expect(closeButton).toBeVisible();
  });

  test("should close file manager when clicking close button", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/");

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Open file manager
    const insertButton = page.locator("button").filter({ hasText: /^Insert$/ });
    await insertButton.click();
    await page.waitForSelector(".dropdown-menu");
    const fileManagerOption = page
      .locator("button.dropdown-item")
      .filter({ hasText: "File Manager" });
    await fileManagerOption.click();

    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toContainText("File Manager");

    // Click close button
    const closeButton = page.locator('button:has-text("×")');
    await closeButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test("should allow file upload via click button", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Open file manager
    const insertButton = page.locator("button").filter({ hasText: /^Insert$/ });
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
    await page.goto("http://localhost:5173/");

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Open file manager
    const insertButton = page.locator("button").filter({ hasText: /^Insert$/ });
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
    await page.goto("http://localhost:5173/");

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Open file manager
    const insertButton = page.locator("button").filter({ hasText: /^Insert$/ });
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
    await page.goto("http://localhost:5173/");

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Open file manager
    const insertButton = page.locator("button").filter({ hasText: /^Insert$/ });
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

    // Find delete button
    const deleteButton = page
      .locator("button")
      .filter({ hasText: /🗑️/ })
      .first();
    await deleteButton.click();

    // Confirm deletion
    page.once("dialog", (dialog) => dialog.accept());

    // File should disappear
    await page.waitForTimeout(500);
    const fileItem = page.locator("text=test.txt");
    await expect(fileItem).not.toBeVisible();
  });
});
