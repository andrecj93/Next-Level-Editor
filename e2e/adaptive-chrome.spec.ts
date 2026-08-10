import { test, expect } from "@playwright/test";

test.beforeEach(() => {
  test.skip(
    test.info().project.name === "mobile-safari",
    "Adaptive chrome is desktop-only (disabled below the 640px shell breakpoint)"
  );
});

test.describe("Cinematic adaptive chrome (letterbox)", () => {
  test.beforeEach(async ({ page }) => {
    // adaptiveChrome now defaults to "off" (a static toolbar); opt into the
    // letterbox mode explicitly via the playground deep-link to exercise it.
    await page.goto("/?empty=true&adaptiveChrome=letterbox");
    await page.waitForSelector(".editor-content");
  });

  test("sustained typing dissolves the toolbar into the letterbox band", async ({
    page,
  }) => {
    const shell = page.locator(".nle-toolbar-shell");
    const toolbar = page.locator(".editor-toolbar-modern").first();
    const band = page.locator(".nle-letterbox");

    // Idle: full toolbar, inert band.
    await expect(shell).toHaveAttribute("data-adaptive", "letterbox");
    await expect(shell).not.toHaveAttribute("data-receded", "true");

    const editor = page.locator(".editor-content").first();
    await editor.click();
    // A click is pointer intent — park the mouse away from the editor so the
    // recede isn't cancelled by residual pointer jitter, then write.
    await page.mouse.move(5, 5);
    await editor.pressSequentially("Writing steadily now", { delay: 40 });

    // Recede lands ~900ms after the last keystroke of the burst.
    await expect(shell).toHaveAttribute("data-receded", "true", {
      timeout: 3000,
    });

    // The band carries its three signals; the buttons have dissolved.
    await expect(band).toBeVisible();
    await expect(band.locator(".nle-letterbox-format")).toHaveText(
      /Paragraph|Heading/
    );
    await expect(band.locator(".nle-letterbox-count")).toContainText("words");
    // The dissolve is a 450ms gentle transition — poll until it completes.
    await expect
      .poll(
        () => toolbar.evaluate((el) => Number(getComputedStyle(el).opacity)),
        { timeout: 2000 }
      )
      .toBeLessThan(0.05);
  });

  test("pointer intent restores the full toolbar instantly and it stays interactive", async ({
    page,
  }) => {
    const shell = page.locator(".nle-toolbar-shell");
    const editor = page.locator(".editor-content").first();

    await editor.click();
    await page.mouse.move(5, 5);
    await editor.pressSequentially("Some words to trigger recede", {
      delay: 40,
    });
    await expect(shell).toHaveAttribute("data-receded", "true", {
      timeout: 3000,
    });

    // Move the pointer over the editor — chrome returns in ~160ms.
    const box = (await editor.boundingBox())!;
    await page.mouse.move(box.x + 120, box.y + 60);
    await expect(shell).not.toHaveAttribute("data-receded", "true", {
      timeout: 1500,
    });

    // And the restored toolbar is fully interactive: select + Bold works.
    await page.keyboard.press("Control+A");
    await page
      .locator('.editor-toolbar-modern button[aria-label="Bold"]')
      .first()
      .click();
    await expect(editor.locator("strong").first()).toBeVisible();
  });

  test("Escape restores the chrome without touching the pointer", async ({
    page,
  }) => {
    const shell = page.locator(".nle-toolbar-shell");
    const editor = page.locator(".editor-content").first();

    await editor.click();
    await page.mouse.move(5, 5);
    await editor.pressSequentially("Thinking with the keyboard only", {
      delay: 40,
    });
    await expect(shell).toHaveAttribute("data-receded", "true", {
      timeout: 3000,
    });

    await page.keyboard.press("Escape");
    await expect(shell).not.toHaveAttribute("data-receded", "true", {
      timeout: 1500,
    });
  });
});
