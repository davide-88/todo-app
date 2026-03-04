import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "./api-fetch.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("returns parsed JSON on 200", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });

    const result = await apiFetch("/api/todos");
    expect(result).toEqual({ data: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/todos"),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) }),
    );
  });

  it("returns undefined on 204", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
    });

    const result = await apiFetch("/api/todos/123");
    expect(result).toBeUndefined();
  });

  it("throws ApiError-shaped object on 400", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({ code: "VALIDATION_ERROR", message: "Invalid input", details: { field: "text" } }),
    });

    await expect(apiFetch("/api/todos")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid input",
      details: { field: "text" },
    });
  });

  it("throws ApiError-shaped object on 500 with fallback code", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });

    await expect(apiFetch("/api/todos")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "Internal Server Error",
    });
  });

  it("throws NETWORK_ERROR on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(apiFetch("/api/todos")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: expect.any(String),
    });
  });

  it("merges custom options", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/todos", { method: "POST", body: '{"text":"test"}' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST", body: '{"text":"test"}' }),
    );
  });

  it("preserves Content-Type when custom headers are provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/todos", { headers: { Authorization: "Bearer token" } });

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("Bearer token");
  });
});
