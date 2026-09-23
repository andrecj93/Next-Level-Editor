import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Writing workspace", () => {
  test("deep links and browser history preserve the active draft", async ({ page }) => {
    await page.goto("/?empty=true#playground");
    const editor = page.getByRole("textbox", { name: "Rich text editor", exact: true });
    await editor.fill("A draft survives navigation.");
    const menu = page.getByRole('button', { name: 'Toggle menu', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Docs', exact: true }).click();
    await expect(page).toHaveURL(/#docs$/);
    await page.goBack();
    await expect(editor).toHaveText("A draft survives navigation.");
    await page.goForward();
    await expect(page).toHaveURL(/#docs$/);
  });

  test("a saved local draft survives refresh and resumes without moving the manuscript", async ({ page }) => {
    await page.goto("/#playground");
    await page.getByRole("button", { name: "New document", exact: true }).click();
    const editor = page.getByRole("textbox", { name: "Rich text editor", exact: true });
    await editor.fill("A local draft worth keeping.");
    await expect(page.locator(".auto-save-indicator")).toContainText("Saved at");
    await page.reload();
    await expect(editor).toHaveText("A local draft worth keeping.");
    await expect(page.getByText("Draft restored.", { exact: true })).toBeVisible();
    await editor.click();
    await editor.press("ControlOrMeta+End");
    const before = (await editor.boundingBox())!;
    await page.keyboard.type(" Still here.");
    await expect(page.getByText("Draft restored.", { exact: true })).not.toBeVisible();
    await expect(editor).toHaveText("A local draft worth keeping. Still here.");
    const after = (await editor.boundingBox())!;
    expect(after.y, "the first keystroke does not move the manuscript").toBeCloseTo(before.y, 0);
    expect(after.height, "the first keystroke does not resize the manuscript").toBeCloseTo(before.height, 0);
  });

  test("New document replaces the persisted draft, including pending edits", async ({ page }) => {
    await page.goto("/#playground");
    const editor = page.getByRole("textbox", { name: "Rich text editor", exact: true });
    await editor.fill("An old draft waiting to save.");
    await page.getByRole("button", { name: "New document", exact: true }).click();
    await page.getByRole("button", { name: "Replace document", exact: true }).click();
    await expect(page.getByText("Your document is saved in this browser.", { exact: true })).toBeVisible();
    await expect(editor).toBeEmpty();
    await page.reload();
    await expect(editor).toBeEmpty();
    await expect(page.getByLabel("Template", { exact: true })).toHaveValue("empty");
  });

  test('a failed reply-only save retains the prior draft and Retry recovers the discussion', async ({ page }) => {
    await page.goto('/#playground');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.fill('Leave room for the reader.');
    await editor.press('ControlOrMeta+a');
    await page.getByRole('toolbar', { name: 'Text formatting toolbar', exact: true }).getByRole('button', { name: 'Insert', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Comment', exact: true }).click();
    const modal = page.locator('.comment-modal');
    await modal.locator('textarea').fill('Keep this ending.');
    await modal.locator('.comment-modal-submit').click();
    const sidebar = page.getByRole('complementary', { name: 'Comments', exact: true });
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
    const savedBeforeReply = await page.evaluate(() => localStorage.getItem('next-level-editor:playground-draft:v1'));
    await page.evaluate(() => {
      const setItem = Storage.prototype.setItem;
      document.documentElement.dataset.rejectDraftWrites = 'true';
      Storage.prototype.setItem = function(key, value) {
        if (key === 'next-level-editor:playground-draft:v1' && document.documentElement.dataset.rejectDraftWrites) {
          throw new DOMException('Storage quota reached', 'QuotaExceededError');
        }
        setItem.call(this, key, value);
      };
    });
    await sidebar.getByRole('button', { name: 'Write a reply', exact: true }).click();
    await sidebar.getByRole('textbox', { name: 'Write a reply', exact: true }).fill('This reply needs to survive.');
    await sidebar.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(page.locator('.auto-save-indicator')).toContainText("Couldn't save changes");
    expect(await page.evaluate(() => localStorage.getItem('next-level-editor:playground-draft:v1'))).toBe(savedBeforeReply);
    await sidebar.getByRole('button', { name: 'Close comments sidebar', exact: true }).click();
    await page.evaluate(() => { delete document.documentElement.dataset.rejectDraftWrites; });
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
    await page.reload();
    await expect(editor).toHaveText('Leave room for the reader.');
    await page.getByRole('button', { name: 'Comments', exact: true }).click();
    await sidebar.getByRole('button', { name: 'View 1 reply', exact: true }).click();
    await expect(sidebar.locator('.comment-reply')).toContainText('This reply needs to survive.');
  });

  test("template selection protects edits and cancellation keeps the selection", async ({ page }) => {
    await page.goto("/?empty=true");
    const editor = page.getByRole("textbox", { name: "Rich text editor", exact: true });
    await editor.fill("Please keep this paragraph.");
    await page.getByRole('button', { name: 'Configure', exact: true }).click();
    await page.getByLabel("Template", { exact: true }).selectOption({ label: "Blog Post" });
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Keep writing", exact: true }).click();
    await expect(editor).toHaveText("Please keep this paragraph.");
    await expect(page.getByLabel("Template", { exact: true })).toHaveValue("empty");
    await page.getByLabel("Template", { exact: true }).selectOption({ label: "Blog Post" });
    await page.getByRole("button", { name: "Replace document", exact: true }).click();
    await expect(editor).not.toHaveText("Please keep this paragraph.");
  });

  test("configuration switches work from the keyboard and height stays usable", async ({ page }) => {
    await page.goto("/?empty=true");
    const configure = page.getByRole("button", { name: "Configure", exact: true });
    await configure.click();
    await expect(configure).toHaveAttribute("aria-expanded", "true");
    const readonly = page.getByRole("checkbox", { name: /Read-only/ });
    await readonly.focus();
    await page.keyboard.press("Space");
    await expect(readonly).toBeChecked();
    await expect(page.getByRole("textbox", { name: "Rich text editor", exact: true })).toHaveAttribute("aria-readonly", "true");
    await page.getByRole('checkbox', { name: /Writing workspace/ }).focus();
    await page.keyboard.press('Space');
    await page.getByLabel("Height (px)", { exact: true }).fill("0");
    expect(await page.locator(".next-level-editor").evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(300);
  });

  test("configuration and search meet the automated accessibility checks", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "axe is covered on Chromium");
    await page.goto("/?empty=true");
    await page.getByRole("button", { name: "Configure", exact: true }).click();
    const scan = async () => {
      // Audit the settled UI, not text halfway through an opacity transition.
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))));
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, detail: n.failureSummary })) }))).toEqual([]);
    };
    await scan();
    await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
    await expect(page.locator(".site")).toHaveClass(/site-dark/);
    await scan();
    await page.getByRole("button", { name: "Configure", exact: true }).click();
    await expect(page.getByRole("region", { name: "Editor configuration" })).toHaveCount(0);
    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    await page.getByRole("menuitem", { name: "Find & Replace", exact: true }).click();
    await expect(page.getByRole("search", { name: "Find & Replace" })).toBeVisible();
    await scan();
  });

  test("the playground and open settings reflow at 320 pixels", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/?empty=true");
    await page.getByRole("button", { name: "Configure", exact: true }).click();
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport + 4);
  });
});
