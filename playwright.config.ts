import { defineConfig, devices } from "@playwright/test";

// 5173 is vite's DEFAULT port, so it is routinely taken by whatever other
// project the developer has running — and since this config refuses to adopt a
// foreign server (see reuseExistingServer below), a busy port would otherwise
// mean "you cannot run the suite until you go kill something". Override with
// `E2E_PORT=5273 npm run test:e2e`.
const PORT = process.env.E2E_PORT || "5173";
const BASE_URL = `http://localhost:${PORT}`;

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
  // `open: "never"`: the html reporter's default is open-on-failure, which
  // SERVES the report and blocks the process until a human closes it — a
  // failing local run popped a browser window and then "ran" for hours while
  // its results sat finished on disk, wedging every scripted/CI-like caller.
  // The report still lands in playwright-report/; view it on demand with
  // `npx playwright show-report`.
  reporter: [["html", { open: "never" }]],
  timeout: 60000, // 60s per test
  expect: {
    timeout: 10000, // 10s for assertions
  },
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
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
    command: `npm run build:demo -- --base=/ && npx vite preview --config vite.demo.config.ts --base=/ --port ${PORT} --strictPort`,
    url: BASE_URL,
    // NEVER adopt whatever answers on :5173. Reuse once made a run test a
    // STALE build of this demo (batch 127), and once an entirely different
    // app — 5173 is vite's default port, so another project's dev server
    // squatting there turned a full run into 204 "app never mounted"
    // failures with zero indication anything was wrong. With strictPort
    // above, a busy port now fails FAST and loud instead.
    reuseExistingServer: false,
    timeout: 180000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
