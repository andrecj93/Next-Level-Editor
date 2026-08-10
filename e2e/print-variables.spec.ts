import { test, expect } from "@playwright/test";

/**
 * R24-1: printing a document erased every variable value.
 *
 * The print CSS hid the "{{ token }}" with `font-size: 0` on the pill and
 * injected attr(data-value) via ::after — but ::after inherits from the PILL,
 * so the value rendered at 0px too. Verified with the real print pipeline
 * (page.pdf()): the page printed "Contract for " with a blank hole.
 *
 * These assertions check RULE APPLICATION under print emulation (which rules
 * match), never computed lengths — Chromium's emulated-print computed values
 * are unreliable (measured: padding read 5.92px against a padding:0!important
 * rule that the real print pipeline honoured).
 */
test.describe("Print: variable pills", () => {
  test.beforeEach(() => {
    // test.info() is only valid inside a running test/hook — a bare
    // describe-level test.skip(test.info()...) crashes COLLECTION and takes
    // the whole run down with "test.info() can only be called while test is
    // running". Same idiom as adaptive-chrome.spec.ts.
    test.skip(
      test.info().project.name === "mobile-safari",
      "print pipeline is desktop-chromium's; one engine suffices"
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/?empty=true", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".editor-content", { timeout: 30000 });
  });

  test("the token is hidden and the value is shown by print rules", async ({
    page,
  }) => {
    const editor = page.locator(".editor-content").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await editor.pressSequentially("Dear {{ user.name }},", { delay: 15 });
    await page.waitForTimeout(300);

    const pill = editor.locator("span.editor-variable");
    await expect(pill).toHaveCount(1);
    // The structural precondition for the whole mechanism: a token wrapper.
    const token = pill.locator(".variable-token");
    await expect(token).toHaveCount(1);

    // Fire the same hook the browser fires before printing, so pills are
    // normalized/re-stamped exactly as a real Ctrl+P run would see them.
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));

    await page.emulateMedia({ media: "print" });
    const verdict = await pill.evaluate((el) => {
      const tokenEl = el.querySelector(".variable-token")!;
      return {
        tokenDisplay: getComputedStyle(tokenEl).display,
        afterContent: getComputedStyle(el, "::after").content,
        dataValue: el.getAttribute("data-value"),
      };
    });

    expect(verdict.tokenDisplay, "token must not paint in print").toBe("none");
    expect(verdict.dataValue, "value must be stamped").toBeTruthy();
    // gCS resolves attr(): the content computes to the stamped value itself.
    expect(verdict.afterContent).toContain(verdict.dataValue!);

    // And back on screen the token is the visible content again.
    await page.emulateMedia({ media: "screen" });
    const screenDisplay = await pill
      .locator(".variable-token")
      .evaluate((el) => getComputedStyle(el).display);
    expect(screenDisplay).not.toBe("none");
  });
});
