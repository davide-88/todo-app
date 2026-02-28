import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./src/schema/migrations",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgresql://todoapp:todoapp@localhost:5432/todoapp",
  },
});
