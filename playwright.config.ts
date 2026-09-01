import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["github"],
    ["line"],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 30000,
    extraHTTPHeaders: {
      Accept: "text/html,application/xhtml+xml",
    },
  },
  projects: [
    // Desktop Chromium
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Security-specific project
    {
      name: "security",
      testMatch: "**/security.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Web server for local testing on port 8080
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npx vite dev --port 8080",
        port: 8080,
        reuseExistingServer: true,
        timeout: 60000,
      },
  outputDir: "./playwright-test-results",
});
