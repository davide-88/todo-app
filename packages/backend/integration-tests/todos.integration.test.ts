import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api, jsonBody, truncateTodos } from "./setup/setup.js";

const todoId = "00000000-0000-0000-0000-000000000001";
const todoId2 = "00000000-0000-0000-0000-000000000002";

beforeEach(async () => {
  await truncateTodos();
});

afterEach(async () => {
  await truncateTodos();
});

describe("POST /api/todos (integration)", () => {
  it("creates a todo and returns 201 with all fields", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      ...jsonBody({ id: todoId, text: "Buy groceries" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      text: string;
      completed: boolean;
      createdAt: string;
      updatedAt: string;
    };
    expect(body.id).toBe(todoId);
    expect(body.text).toBe("Buy groceries");
    expect(body.completed).toBe(false);
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it("upserts on duplicate id (does not duplicate)", async () => {
    await api("/api/todos", { method: "POST", ...jsonBody({ id: todoId, text: "Original" }) });
    const secondResponse = await api("/api/todos", {
      method: "POST",
      ...jsonBody({ id: todoId, text: "Updated" }),
    });
    expect(secondResponse.status).toBe(201);
    expect(((await secondResponse.json()) as { text: string }).text).toBe("Updated");

    const list = await api("/api/todos");
    const body = (await list.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });

  it("returns 400 for empty text", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      ...jsonBody({ id: todoId, text: "" }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for text exceeding maxTextLength", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      ...jsonBody({ id: todoId, text: "x".repeat(501) }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/todos (integration)", () => {
  beforeEach(async () => {
    await api("/api/todos", { method: "POST", ...jsonBody({ id: todoId, text: "First" }) });
    await new Promise((r) => setTimeout(r, 50));
    await api("/api/todos", { method: "POST", ...jsonBody({ id: todoId2, text: "Second" }) });
  });

  it("returns todos sorted by createdAt desc by default", async () => {
    const res = await api("/api/todos");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { text: string }[] };
    expect(body.data[0]?.text).toBe("Second");
    expect(body.data[1]?.text).toBe("First");
  });

  it("filters active todos", async () => {
    await api(`/api/todos/${todoId}`, { method: "PATCH", ...jsonBody({ completed: true }) });
    const res = await api("/api/todos?status=active");
    const body = (await res.json()) as { data: { text: string }[] };
    expect(body.data.every((t) => t.text !== "First")).toBe(true);
    expect(body.data.some((t) => t.text === "Second")).toBe(true);
  });

  it("filters completed todos", async () => {
    await api(`/api/todos/${todoId}`, { method: "PATCH", ...jsonBody({ completed: true }) });
    const res = await api("/api/todos?status=completed");
    const body = (await res.json()) as { data: { text: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.text).toBe("First");
  });

  it("supports cursor pagination", async () => {
    const page1 = await api("/api/todos?limit=1");
    const p1Body = (await page1.json()) as { data: { text: string }[]; cursor: string | null };
    expect(p1Body.data).toHaveLength(1);
    expect(p1Body.cursor).not.toBeNull();

    const page2 = await api(`/api/todos?limit=1&cursor=${p1Body.cursor}`);
    const p2Body = (await page2.json()) as { data: { text: string }[] };
    expect(p2Body.data).toHaveLength(1);
    expect(p2Body.data[0]?.text).not.toBe(p1Body.data[0]?.text);
  });
});

describe("PATCH /api/todos/:id (integration)", () => {
  beforeEach(async () => {
    await api("/api/todos", { method: "POST", ...jsonBody({ id: todoId, text: "Task" }) });
  });

  it("updates todo and returns updated todo with changed updatedAt", async () => {
    await new Promise((r) => setTimeout(r, 50));
    const res = await api(`/api/todos/${todoId}`, {
      method: "PATCH",
      ...jsonBody({ completed: true }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { completed: boolean; updatedAt: string; createdAt: string };
    expect(body.completed).toBe(true);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(body.createdAt).getTime(),
    );
  });

  it("returns 404 for non-existent id", async () => {
    const res = await api("/api/todos/00000000-0000-0000-0000-999999999999", {
      method: "PATCH",
      ...jsonBody({ completed: true }),
    });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/todos/:id (integration)", () => {
  beforeEach(async () => {
    await api("/api/todos", { method: "POST", ...jsonBody({ id: todoId, text: "Delete me" }) });
  });

  it("deletes existing todo and returns 204", async () => {
    const res = await api(`/api/todos/${todoId}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  it("is idempotent — returns 204 for non-existent todo", async () => {
    const res = await api("/api/todos/00000000-0000-0000-0000-999999999999", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});
