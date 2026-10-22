import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const installedChromium =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  testDir: "./tests",
  testMatch: "e2e.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3011",
    launchOptions: installedChromium
      ? { executablePath: installedChromium }
      : {},
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && node server/index.mjs",
    url: "http://127.0.0.1:3011/api/health",
    env: {
      PORT: "3011",
      DATABASE_PATH: `/tmp/ruangkita-e2e-${randomUUID()}.sqlite`,
      NODE_ENV: "test",
    },
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
