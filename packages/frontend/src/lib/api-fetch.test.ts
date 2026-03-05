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
    expect(result).toBeDefined();
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

  it("captures HTTP status in error on 400", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({ code: "VALIDATION_ERROR", message: "Invalid input" }),
    });

    await expect(apiFetch("/api/todos")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("captures HTTP status in error on 500", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });

    await expect(apiFetch("/api/todos")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      status: 500,
    });
  });

  it("uses status=0 for network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(apiFetch("/api/todos")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });

  it("sets Content-Type only when body is present", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    // With body → Content-Type set
    await apiFetch("/api/todos", { method: "POST", body: '{"text":"x"}' });
    const withBody = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((withBody[1].headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    mockFetch.mockClear();

    // Without body → Content-Type not set
    await apiFetch("/api/todos/1", { method: "DELETE" });
    const withoutBody = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((withoutBody[1].headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("merges custom headers alongside Content-Type when body present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/todos", { method: "POST", body: '{}', headers: { Authorization: "Bearer token" } });

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("Bearer token");
  });
});
