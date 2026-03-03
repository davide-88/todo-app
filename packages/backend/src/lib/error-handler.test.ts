import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { registerErrorHandler } from "./error-handler.js";
import { errorCodes } from "@todo-app/shared";

function buildApp() {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  return app;
}

describe("registerErrorHandler", () => {
  it("maps validation errors → 400 VALIDATION_ERROR", async () => {
    const app = buildApp();
    app.get("/test", {
      schema: {
        querystring: {
          type: "object",
          properties: { n: { type: "number" } },
          required: ["n"],
        },
      },
      handler: async (_req, reply) => reply.send({ ok: true }),
    });

    const res = await app.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ code: string }>();
    expect(body.code).toBe(errorCodes.VALIDATION_ERROR);
  });

  it("maps explicit 404 errors → 404 NOT_FOUND", async () => {
    const app = buildApp();
    app.get("/not-found", (_req, reply) => {
      const err = new Error("Todo not found");
      (err as NodeJS.ErrnoException & { statusCode?: number }).statusCode = 404;
      void reply.send(err);
    });

    const res = await app.inject({ method: "GET", url: "/not-found" });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ code: string }>().code).toBe(errorCodes.NOT_FOUND);
  });

  it("maps rate limit 429 → 429 RATE_LIMITED", async () => {
    const app = buildApp();
    app.get("/rate-limited", () => {
      const err = new Error("Rate limit exceeded");
      (err as NodeJS.ErrnoException & { statusCode?: number }).statusCode = 429;
      throw err;
    });

    const res = await app.inject({ method: "GET", url: "/rate-limited" });
    expect(res.statusCode).toBe(429);
    expect(res.json<{ code: string }>().code).toBe(errorCodes.RATE_LIMITED);
  });

  it("maps unknown errors → 500 INTERNAL_ERROR", async () => {
    const app = buildApp();
    app.get("/boom", () => {
      throw new Error("unexpected");
    });

    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.json<{ code: string }>().code).toBe(errorCodes.INTERNAL_ERROR);
  });
});
