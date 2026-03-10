import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @todo-app/backend dev",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !process.env["CI"],
      timeout: 30000,
      env: {
        RATE_LIMIT_MAX: "1000",
      },
    },
    {
      command: "pnpm --filter @todo-app/frontend dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env["CI"],
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
