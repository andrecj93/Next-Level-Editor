import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { ensureToolbarExpanded } from "./helpers/toolbar";

// Exercise the delivered files, including lazy-loaded converters, rather than
// only checking that the four export menu items exist.
for (const format of ["HTML", "Markdown", "PDF", "Word"] as const) {
  test(`${format} export produces a usable download`, async ({ page }) => {
    await page.goto("/?empty=true");
    await page.getByRole("textbox", { name: "Rich text editor", exact: true })
      .fill("A document worth sharing.");
    // Touch devices offer a persistent bar as well as the main toolbar.
    const closeMobile = page.getByRole("button", { name: "Close toolbar", exact: true });
    if (await closeMobile.isVisible()) await closeMobile.click();
    await ensureToolbarExpanded(page);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const pendingDownload = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: format, exact: true }).click();
    const download = await pendingDownload;
    expect(await download.failure()).toBeNull();
    const file = await download.path();
    expect(file).not.toBeNull();
    const bytes = await readFile(file!);
    const extension = { HTML: "html", Markdown: "md", PDF: "pdf", Word: "docx" }[format];
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
    if (format === "PDF") {
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.toString("latin1")).toContain("%%EOF");
      expect(bytes.length).toBeGreaterThan(1000);
    } else if (format === "Word") {
      expect(bytes.subarray(0, 2).toString()).toBe("PK");
      expect(bytes.includes(Buffer.from("[Content_Types].xml"))).toBe(true);
      expect(bytes.length).toBeGreaterThan(1000);
    } else {
      expect(bytes.toString()).toContain("A document worth sharing.");
      if (format === "HTML") expect(bytes.toString()).toMatch(/<!DOCTYPE html>/i);
    }
    await test.info().attach(`document.${extension}`, { path: file!, contentType: "application/octet-stream" });
  });
}
