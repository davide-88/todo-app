import { config } from "@/config.js";
import { createDrizzleTodoRepository } from "@/lib/drizzle-todo-repository.js";
import type { TodoRepository } from "@/lib/todo-repository.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import fp from "fastify-plugin";
import { resolve } from "node:path";
import { Pool } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    db: TodoRepository;
  }
}

export const dbPlugin = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
  });
  pool.on("error", (err) => {
    fastify.log.error(err, "pg pool error");
  });
  const db = drizzle(pool);
  const migrationsFolder = resolve(process.cwd(), "src/schema/migrations");
  await migrate(db, { migrationsFolder });
  fastify.decorate("db", createDrizzleTodoRepository(db));
  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
