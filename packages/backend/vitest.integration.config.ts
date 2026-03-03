import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    globalSetup: ["integration-tests/setup/global-setup.ts"],
    setupFiles: ["integration-tests/setup/vitest-setup.ts"],
    include: ["integration-tests/**/*.integration.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
