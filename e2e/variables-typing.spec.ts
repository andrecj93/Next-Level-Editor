import { test, expect } from "@playwright/test";

/**
 * Regression suite for the template-variables cluster.
 *
 * The critical bug: once any {{ variable }} pill existed, every keystroke
 * triggered a wrap + sanitize round-trip whose output differed from the DOM
 * (pill attributes were stripped), so innerHTML was rewritten on every input
 * and the caret collapsed to the document start — typed text came out
 * reversed at position 0.
 */
test.describe("Variables", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".editor-content", { timeout: 30000 });
  });

  test("typing after a manually completed token appends in order at the caret", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    await editor.pressSequentially("Year: {{ date.year }}", { delay: 15 });
    // Give the wrap + v-model round-trip a beat to settle.
    await page.waitForTimeout(300);

    // The completed token became a pill and survived sanitization.
    const pill = editor.locator("span.editor-variable");
    await expect(pill).toHaveCount(1);
    await expect(pill).toHaveAttribute("data-variable", "date.year");

    // THE regression: continuing to type must append after the pill, in
    // order — not reversed at the document start.
    await editor.pressSequentially(" END", { delay: 30 });
    await page.waitForTimeout(300);

    const text = (await editor.textContent()) ?? "";
    expect(text.replace(/ /g, " ")).toContain(
      "Year: {{ date.year }} END"
    );
    expect(text).not.toMatch(/^DNE/); // reversed-at-start corruption
    // Still exactly one pill — no duplicate nesting from re-wrapping.
    await expect(editor.locator("span.editor-variable")).toHaveCount(1);
    await expect(
      editor.locator(".editor-variable .editor-variable")
    ).toHaveCount(0);
  });

  test("Enter accepts the highlighted autocomplete suggestion instead of inserting a paragraph", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    await editor.pressSequentially("Hi {{us", { delay: 25 });
    await expect(page.locator(".variable-autocomplete")).toBeVisible();

    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // The partial "{{us" was replaced by a pill; no stray empty paragraph.
    const pill = editor.locator("span.editor-variable");
    await expect(pill).toHaveCount(1);
    await expect(pill).toHaveAttribute("data-variable", /^user\./);
    const text = (await editor.textContent()) ?? "";
    expect(text).not.toContain("{{us");
    await expect(page.locator(".variable-autocomplete")).toBeHidden();
  });

  test("pill attributes survive the sanitizer round-trip", async ({ page }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    await editor.pressSequentially("{{ company.name }} rocks", { delay: 15 });
    await page.waitForTimeout(400);

    const pill = editor.locator("span.editor-variable");
    await expect(pill).toHaveCount(1);
    await expect(pill).toHaveAttribute("data-variable", "company.name");
    await expect(pill).toHaveAttribute("data-value", "Acme Corp");
    await expect(pill).toHaveAttribute("contenteditable", "false");
  });

  test("variables FAB opens a panel that lists variables and inserts on click", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await editor.pressSequentially("Dear ", { delay: 15 });

    const fab = page.locator(".variables-toggle-fab");
    await expect(fab).toBeVisible();
    await fab.click();

    const panel = page.locator(".variables-panel");
    await expect(panel).toBeVisible();
    // Lists the built-in variables with their values.
    await expect(
      panel.locator(".variables-panel-item-name", { hasText: "user.name" })
    ).toBeVisible();
    await expect(
      panel.locator(".variables-panel-item-value", { hasText: "John Doe" })
    ).toBeVisible();

    await panel
      .locator(".variables-panel-item", { hasText: "user.name" })
      .first()
      .click();
    await page.waitForTimeout(300);

    const pill = editor.locator("span.editor-variable");
    await expect(pill).toHaveCount(1);
    await expect(pill).toHaveAttribute("data-variable", "user.name");
  });

  test("autocomplete uses stroke SVG icons, not emoji", async ({ page }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    await editor.pressSequentially("{{", { delay: 25 });
    const dropdown = page.locator(".variable-autocomplete");
    await expect(dropdown).toBeVisible();

    await expect(
      dropdown.locator(".variable-autocomplete-icon svg")
    ).toHaveCount(1);
    expect(
      await dropdown.locator(".variable-autocomplete-item-icon svg").count()
    ).toBeGreaterThan(0);
    const dropdownText = (await dropdown.textContent()) ?? "";
    expect(dropdownText).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
