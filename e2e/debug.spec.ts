import { test } from "@playwright/test";

test.describe("Debug Test", () => {
  test("check what's on the page", async ({ page }) => {
    // Capture console messages and errors
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on("console", (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/?empty=true");

    // Wait for page load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Check if app mounted
    const appEl = await page.locator("#app").count();
    console.log("App element count:", appEl);

    // Check if Vue app rendered
    const vueApp = await page.locator(".next-level-editor").count();
    console.log("Vue app count:", vueApp);

    // Check if editor content exists (even if hidden)
    const editorContent = await page.locator(".editor-content").count();
    console.log("Editor content count:", editorContent);

    // Get all classes on body
    const bodyHTML = await page.locator("body").innerHTML();
    console.log("Body HTML length:", bodyHTML.length);

    // Get page title
    const title = await page.title();
    console.log("Page title:", title);

    console.log("Console messages:", consoleMessages);
    console.log("Page errors:", errors);
  });
});
