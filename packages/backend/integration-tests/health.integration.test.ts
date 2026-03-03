import { describe, expect, it } from "vitest";
import { api } from "./setup/setup.js";

describe("GET /api/health (integration)", () => {
  it("returns 200 { status: 'ok' } when Postgres is connected", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
