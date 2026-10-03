import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  // Serial workers: tests share one dev server; serial run eliminates the
  // cross-test timing race observed once (recorded in docs/BUILD_LOG.md M7).
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
