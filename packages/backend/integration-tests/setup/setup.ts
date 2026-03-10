import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../../src/config.js";

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export const BASE_URL = `http://${config.HOST}:${config.PORT}`;

export function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init);
}

export function jsonBody(data: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function getDb(): ReturnType<typeof drizzle> {
  if (!db) {
    pool = new Pool({ connectionString: config.DATABASE_URL });
    db = drizzle(pool);
  }
  return db;
}

export async function truncateTodos(): Promise<void> {
  await getDb().execute(sql`TRUNCATE TABLE todos RESTART IDENTITY CASCADE`);
}

export async function teardownSetup(): Promise<void> {
  await truncateTodos();
  await pool?.end();
  pool = undefined;
  db = undefined;
}
