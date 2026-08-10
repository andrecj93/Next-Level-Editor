import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Suppress console errors from Vite HMR
  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      msg.text().includes("Cannot read properties of undefined")
    ) {
      // Ignore Vite HMR errors
      return;
    }
  });

  page.on("pageerror", (error) => {
    // Ignore Vite HMR errors
    if (error.message.includes("Cannot read properties of undefined")) {
      return;
    }
    console.error(error);
  });

  // Wait for the server to be ready
  const baseURL = config.projects[0].use.baseURL || "http://localhost:5173";
  try {
    await page.goto(baseURL, { timeout: 30000 });
    await page.waitForTimeout(2000); // Let HMR settle
  } catch (error) {
    console.log("Initial page load completed with warnings (expected)", error);
  }

  await browser.close();
}

export default globalSetup;
