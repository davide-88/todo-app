import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDrizzleTodoRepository } from "./drizzle-todo-repository.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const mockTodo = {
  id: "00000000-0000-0000-0000-000000000001",
  text: "Buy groceries",
  completed: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const mockTodoSerialized = {
  id: mockTodo.id,
  text: mockTodo.text,
  completed: mockTodo.completed,
  createdAt: mockTodo.createdAt.toISOString(),
  updatedAt: mockTodo.updatedAt.toISOString(),
};

interface SelectMocks {
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
}

function makeMockDb(overrides: Partial<NodePgDatabase> = {}) {
  const returning = vi.fn().mockResolvedValue([mockTodo]);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  const returningUpdate = vi.fn().mockResolvedValue([mockTodo]);
  const whereUpdate = vi.fn().mockReturnValue({ returning: returningUpdate });
  const set = vi.fn().mockReturnValue({ where: whereUpdate });
  const update = vi.fn().mockReturnValue({ set });

  const whereDelete = vi.fn().mockResolvedValue([]);
  const deleteFrom = vi.fn().mockReturnValue({ where: whereDelete });

  const limit = vi.fn().mockResolvedValue([mockTodo]);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });
  const select = vi.fn().mockReturnValue({ from });

  const execute = vi.fn().mockResolvedValue([]);

  const db = {
    insert,
    update,
    delete: deleteFrom,
    select,
    execute,
    ...overrides,
  } as unknown as NodePgDatabase;

  const getSelectMocks = (): SelectMocks => {
    const fromResult = select.mock.results[0]!.value as {
      from: ReturnType<typeof vi.fn>;
    };
    return fromResult.from.mock.results[0]!.value as SelectMocks;
  };

  return { db, getSelectMocks };
}

describe("createDrizzleTodoRepository", () => {
  let db: NodePgDatabase;
  let repo: ReturnType<typeof createDrizzleTodoRepository>;
  let getSelectMocks: () => SelectMocks;

  beforeEach(() => {
    ({ db, getSelectMocks } = makeMockDb());
    repo = createDrizzleTodoRepository(db);
  });

  describe("create", () => {
    it("inserts a new todo and returns it serialized", async () => {
      const result = await repo.create({
        id: mockTodo.id,
        text: mockTodo.text,
      });
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockTodoSerialized);
    });

    it("uses onConflictDoUpdate for upsert", async () => {
      await repo.create({ id: mockTodo.id, text: "Updated text" });
      const insertCall = (db.insert as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value as { values: ReturnType<typeof vi.fn> };
      expect(insertCall.values).toHaveBeenCalled();
    });
  });

  describe("findMany", () => {
    it("returns serialized todos", async () => {
      const result = await repo.findMany({ limit: 20 });
      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockTodoSerialized]);
    });

    it("passes undefined to where when no filters", async () => {
      await repo.findMany({ limit: 20 });
      const { where } = getSelectMocks();
      const [whereArg] = where.mock.calls[0] as [unknown];
      expect(whereArg).toBeUndefined();
    });

    it("passes a condition to where for status: active", async () => {
      await repo.findMany({ limit: 20, status: "active" });
      const { where } = getSelectMocks();
      const [whereArg] = where.mock.calls[0] as [unknown];
      expect(whereArg).toBeDefined();
    });

    it("passes a condition to where for status: completed", async () => {
      await repo.findMany({ limit: 20, status: "completed" });
      const { where } = getSelectMocks();
      const [whereArg] = where.mock.calls[0] as [unknown];
      expect(whereArg).toBeDefined();
    });

    it("passes a condition to where when cursor is provided", async () => {
      const cursor = new Date("2026-01-01T00:00:00.000Z");
      await repo.findMany({ limit: 20, cursor });
      const { where } = getSelectMocks();
      const [whereArg] = where.mock.calls[0] as [unknown];
      expect(whereArg).toBeDefined();
    });

    it("passes a different orderBy arg for asc vs desc", async () => {
      await repo.findMany({ limit: 20, order: "desc" });
      const { orderBy: orderByDesc } = getSelectMocks();
      const [descArg] = orderByDesc.mock.calls[0] as [unknown];

      ({ db, getSelectMocks } = makeMockDb());
      repo = createDrizzleTodoRepository(db);
      await repo.findMany({ limit: 20, order: "asc" });
      const { orderBy: orderByAsc } = getSelectMocks();
      const [ascArg] = orderByAsc.mock.calls[0] as [unknown];

      expect(ascArg).not.toStrictEqual(descArg);
    });
  });

  describe("update", () => {
    it("returns the updated todo when found", async () => {
      const result = await repo.update(mockTodo.id, { completed: true });
      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(mockTodoSerialized);
    });

    it("returns null when todo not found", async () => {
      const returningEmpty = vi.fn().mockResolvedValue([]);
      const whereUpdateEmpty = vi
        .fn()
        .mockReturnValue({ returning: returningEmpty });
      const setEmpty = vi.fn().mockReturnValue({ where: whereUpdateEmpty });
      const updateEmpty = vi.fn().mockReturnValue({ set: setEmpty });
      ({ db } = makeMockDb({ update: updateEmpty }));
      repo = createDrizzleTodoRepository(db);

      const result = await repo.update("non-existent-id", { completed: true });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes a todo by id", async () => {
      await repo.delete(mockTodo.id);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("healthCheck", () => {
    it("executes a SELECT 1 query", async () => {
      await repo.healthCheck();
      expect(db.execute).toHaveBeenCalled();
    });

    it("throws if the query fails", async () => {
      const failExecute = vi.fn().mockRejectedValue(new Error("DB down"));
      ({ db } = makeMockDb({ execute: failExecute }));
      repo = createDrizzleTodoRepository(db);

      await expect(repo.healthCheck()).rejects.toThrow("DB down");
    });
  });
});
