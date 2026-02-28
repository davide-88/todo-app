import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "**/*.test.ts"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 90,
        statements: 90,
      },
    },
  },
});
