import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // CI runs both projects serially on a shared runner; webkit (mobile-safari)
  // runs after chromium, by which point the long-lived dev server can be slow,
  // so give clicks/navigation more headroom in CI to avoid spurious timeouts.
  timeout: process.env.CI ? 90000 : 60000,
  expect: {
    timeout: process.env.CI ? 15000 : 10000,
  },
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: process.env.CI ? 45000 : 30000,
    actionTimeout: process.env.CI ? 30000 : 15000,
  },

  projects: [
    // Default: Desktop Chrome only (fast feedback)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Uncomment below for full cross-browser testing:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "ignore",
    stderr: "ignore",
    env: {
      DISABLE_HMR: "true",
    },
  },
});
