import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { healthRoute } from "./health.js";
import type { TodoRepository } from "@/lib/todo-repository.js";

function buildApp(repo: Partial<TodoRepository>) {
  const app = Fastify({ logger: false });
  app.decorate("db", repo as TodoRepository);
  app.register(healthRoute);
  return app;
}

describe("GET /health", () => {
  it("returns 200 { status: 'ok' } when DB is healthy", async () => {
    const repo = { healthCheck: vi.fn().mockResolvedValue(undefined) };
    const app = buildApp(repo);

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    expect(repo.healthCheck).toHaveBeenCalledOnce();
  });

  it("returns 503 { status: 'error' } when DB healthCheck throws", async () => {
    const repo = { healthCheck: vi.fn().mockRejectedValue(new Error("Connection refused")) };
    const app = buildApp(repo);

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(503);
    const body = res.json<{ status: string; message: string }>();
    expect(body.status).toBe("error");
    expect(body.message).toBeDefined();
  });
});
