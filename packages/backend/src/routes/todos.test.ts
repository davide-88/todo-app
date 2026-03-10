import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { todosRoutes } from "./todos.js";
import { registerErrorHandler } from "@/lib/error-handler.js";
import type { TodoRepository } from "@/lib/todo-repository.js";

const mockTodo = {
  id: "00000000-0000-0000-0000-000000000001",
  text: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function createMockRepo(
  overrides: Partial<TodoRepository> = {},
): TodoRepository {
  return {
    create: vi.fn().mockResolvedValue(mockTodo),
    findMany: vi.fn().mockResolvedValue([mockTodo]),
    update: vi.fn().mockResolvedValue(mockTodo),
    delete: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildTestApp(repo: TodoRepository) {
  const app = Fastify({ logger: false });
  app.decorate("db", repo);
  registerErrorHandler(app);
  app.register(todosRoutes, { prefix: "/api/todos" });
  return app;
}

describe("POST /api/todos", () => {
  it("creates a todo and returns 201", async () => {
    const repo = createMockRepo();
    const app = buildTestApp(repo);
    const res = await app.inject({
      method: "POST",
      url: "/api/todos",
      payload: { id: mockTodo.id, text: "Buy groceries" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      id: mockTodo.id,
      text: "Buy groceries",
    });
    expect(repo.create).toHaveBeenCalledWith({
      id: mockTodo.id,
      text: "Buy groceries",
    });
  });

  it("returns 400 VALIDATION_ERROR for empty text", async () => {
    const app = buildTestApp(createMockRepo());
    const res = await app.inject({
      method: "POST",
      url: "/api/todos",
      payload: { id: mockTodo.id, text: "" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when id is missing", async () => {
    const app = buildTestApp(createMockRepo());
    const res = await app.inject({
      method: "POST",
      url: "/api/todos",
      payload: { text: "Hello" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when text exceeds maxTextLength", async () => {
    const app = buildTestApp(createMockRepo());
    const res = await app.inject({
      method: "POST",
      url: "/api/todos",
      payload: { id: mockTodo.id, text: "x".repeat(501) },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/todos", () => {
  it("returns 200 with data array and cursor", async () => {
    const repo = createMockRepo();
    const app = buildTestApp(repo);
    const res = await app.inject({ method: "GET", url: "/api/todos" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[]; cursor: string | null }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect("cursor" in body).toBe(true);
    expect(repo.findMany).toHaveBeenCalled();
  });

  it("passes status filter to repository", async () => {
    const repo = createMockRepo();
    const app = buildTestApp(repo);
    await app.inject({ method: "GET", url: "/api/todos?status=active" });
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
  });

  it("passes order to repository", async () => {
    const repo = createMockRepo();
    const app = buildTestApp(repo);
    await app.inject({ method: "GET", url: "/api/todos?order=asc" });
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ order: "asc" }),
    );
  });

  it("decodes cursor and passes as Date to repository", async () => {
    const cursorDate = new Date("2026-01-01T00:00:00.000Z");
    const encodedCursor = Buffer.from(cursorDate.toISOString()).toString(
      "base64url",
    );
    const repo = createMockRepo();
    const app = buildTestApp(repo);
    await app.inject({
      method: "GET",
      url: `/api/todos?cursor=${encodedCursor}`,
    });
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: cursorDate }),
    );
  });

  it("encodes nextCursor when result fills the page", async () => {
    const todos = Array.from({ length: 20 }, (_, i) => ({
      ...mockTodo,
      id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const repo = createMockRepo({ findMany: vi.fn().mockResolvedValue(todos) });
    const app = buildTestApp(repo);
    const res = await app.inject({ method: "GET", url: "/api/todos" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ cursor: string | null }>();
    expect(body.cursor).not.toBeNull();
  });

  it("returns null cursor when result is less than page size", async () => {
    const repo = createMockRepo({
      findMany: vi.fn().mockResolvedValue([mockTodo]),
    });
    const app = buildTestApp(repo);
    const res = await app.inject({ method: "GET", url: "/api/todos" });
    const body = res.json<{ cursor: null }>();
    expect(body.cursor).toBeNull();
  });
});

describe("PATCH /api/todos/:id", () => {
  it("returns 200 with updated todo", async () => {
    const updated = { ...mockTodo, completed: true };
    const repo = createMockRepo({ update: vi.fn().mockResolvedValue(updated) });
    const app = buildTestApp(repo);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/todos/${mockTodo.id}`,
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ completed: boolean }>().completed).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(mockTodo.id, { completed: true });
  });

  it("returns 404 NOT_FOUND when todo does not exist", async () => {
    const repo = createMockRepo({ update: vi.fn().mockResolvedValue(null) });
    const app = buildTestApp(repo);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/todos/${mockTodo.id}`,
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ code: string }>().code).toBe("NOT_FOUND");
  });

  it("returns 400 VALIDATION_ERROR for invalid body", async () => {
    const app = buildTestApp(createMockRepo());
    const res = await app.inject({
      method: "PATCH",
      url: `/api/todos/${mockTodo.id}`,
      payload: { completed: "yes" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/todos/:id", () => {
  it("returns 204 (idempotent — same result whether todo exists or not)", async () => {
    const repo = createMockRepo();
    const app = buildTestApp(repo);
    const res = await app.inject({
      method: "DELETE",
      url: `/api/todos/${mockTodo.id}`,
    });
    expect(res.statusCode).toBe(204);
    expect(repo.delete).toHaveBeenCalledWith(mockTodo.id);
  });
});
