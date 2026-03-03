import { eq, lt, gt, and, asc, desc, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { todosTable } from "@/schema/todos-table.js";
import type { TodoRepository } from "./todo-repository.js";
import type { Todo } from "@todo-app/shared";

function serializeTodo(row: typeof todosTable.$inferSelect): Todo {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createDrizzleTodoRepository(db: NodePgDatabase): TodoRepository {
  return {
    async create({ id, text }) {
      const [todo] = await db
        .insert(todosTable)
        .values({ id, text })
        .onConflictDoUpdate({ target: todosTable.id, set: { text } })
        .returning();
      return serializeTodo(todo!);
    },

    async findMany({ status, order: dir = "desc", cursor, limit }) {
      const conditions = [];
      if (status === "active") conditions.push(eq(todosTable.completed, false));
      if (status === "completed") conditions.push(eq(todosTable.completed, true));
      if (cursor) {
        conditions.push(
          dir === "asc" ? gt(todosTable.createdAt, cursor) : lt(todosTable.createdAt, cursor),
        );
      }

      const rows = await db
        .select()
        .from(todosTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(dir === "asc" ? asc(todosTable.createdAt) : desc(todosTable.createdAt))
        .limit(limit);

      return rows.map(serializeTodo);
    },

    async update(id, data) {
      const [row] = await db
        .update(todosTable)
        .set(data)
        .where(eq(todosTable.id, id))
        .returning();
      return row ? serializeTodo(row) : null;
    },

    async delete(id) {
      await db.delete(todosTable).where(eq(todosTable.id, id));
    },

    async healthCheck() {
      await db.execute(sql`SELECT 1`);
    },
  };
}
