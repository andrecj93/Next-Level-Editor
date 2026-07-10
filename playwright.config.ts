import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry: WebKit under parallel load occasionally misses an
  // actionability window (tests that pass 100% in isolation). A retried pass
  // is reported as "flaky" — the signal stays visible, the run stays green.
  retries: process.env.CI ? 2 : 1,
  // Local WebKit contention is the flake source (CI runs 1 worker and never
  // flakes; unbounded local runs used ~8). Four is the measured sweet spot.
  workers: process.env.CI ? 1 : 4,
  reporter: "html",
  timeout: 60000, // 60s per test
  expect: {
    timeout: 10000, // 10s for assertions
  },
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30000,
    actionTimeout: 15000,
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
    // Serve a PRODUCTION build of the demo (base '/' so the e2e paths resolve
    // at root) instead of the vite dev server. The dev server compiles modules
    // on demand, which on a cold CI runner made the slower webkit/mobile-safari
    // project time out on clicks; a prebuilt static bundle is fast and stable.
    command:
      "npm run build:demo -- --base=/ && npx vite preview --config vite.demo.config.ts --base=/ --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
