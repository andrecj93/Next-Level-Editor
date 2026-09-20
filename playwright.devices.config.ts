import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// A separate, repeatable device gate: every scenario runs in every project.
// Device descriptors emulate browser capabilities; they are not physical phones.
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: '**/device-matrix.spec.ts',
  globalSetup: undefined,
  outputDir: 'test-results/devices',
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report/devices', open: 'never' }],
    ['json', { outputFile: 'playwright-report/devices/results.json' }],
  ],
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'wide-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1080 } } },
    { name: 'touch-laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: 'ipad-portrait', use: { ...devices['iPad Mini'] } },
    { name: 'ipad-landscape', use: { ...devices['iPad Mini landscape'] } },
    { name: 'android-tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'phone-small', use: { ...devices['iPhone SE'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 13 landscape'] } },
    { name: 'android', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
    { name: 'android-landscape', use: { ...devices['Pixel 5'], viewport: { width: 740, height: 360 } } },
    { name: 'phone-large', use: { ...devices['iPhone 13'], viewport: { width: 430, height: 780 } } },
    { name: 'zoom-200-reflow', use: { ...devices['Desktop Chrome'], viewport: { width: 640, height: 384 } } },
    { name: 'zoom-400-reflow', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 256 } } },
    { name: 'phone-reduced-height', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 360 } } },
    { name: 'narrow-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 600, height: 900 } } },
  ],
});
