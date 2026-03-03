import { defineConfig } from "drizzle-kit";
import { config } from "./src/config.js";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/todos-table.ts",
  out: "./src/schema/migrations",
  dbCredentials: {
    url: config.DATABASE_URL,
  },
});
