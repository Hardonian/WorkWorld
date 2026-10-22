import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  // Serial workers: tests share one dev server; serial run eliminates the
  // cross-test timing race observed once (recorded in docs/BUILD_LOG.md M7).
  workers: 1,
  use: {
    baseURL: "http://localhost:3219",
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev -p 3219 -H 127.0.0.1",
    url: "http://localhost:3219",
    // Never attach to a different checkout's development server.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
