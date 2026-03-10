import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useTodos } from "./use-todos.js";

vi.mock("@/lib/api-fetch.js", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTodos", () => {
  it("returns isLoading=true initially", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTodos(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns todos on successful fetch", async () => {
    const todos = [
      {
        id: "1",
        text: "test",
        completed: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];
    mockApiFetch.mockResolvedValueOnce({ data: todos, cursor: null });

    const { result } = renderHook(() => useTodos(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.todos).toEqual(todos);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("returns empty array when server returns no todos", async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], cursor: null });

    const { result } = renderHook(() => useTodos(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.todos).toEqual([]);
  });

  it("sets hasNextPage=true when cursor is returned", async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          text: "a",
          completed: false,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      cursor: "cursor-xyz",
    });

    const { result } = renderHook(() => useTodos(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(true);
  });

  it("passes status and order params to apiFetch", async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], cursor: null });

    const { result } = renderHook(
      () => useTodos({ status: "active", order: "asc" }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("status=active"),
      undefined,
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("order=asc"),
      undefined,
    );
  });

  it("exposes error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce({
      code: "NETWORK_ERROR",
      message: "Failed",
    });

    const { result } = renderHook(() => useTodos(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("fetchNextPage appends second page to todos and passes cursor param", async () => {
    const page1 = [
      {
        id: "1",
        text: "todo 1",
        completed: false,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      },
    ];
    const page2 = [
      {
        id: "2",
        text: "todo 2",
        completed: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];
    const cursor = "cursor-abc";

    let resolvePage2!: (val: unknown) => void;
    const page2Promise = new Promise((resolve) => {
      resolvePage2 = resolve;
    });

    mockApiFetch
      .mockResolvedValueOnce({ data: page1, cursor })
      .mockReturnValueOnce(page2Promise);

    const { result } = renderHook(() => useTodos(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.todos).toEqual(page1);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      void result.current.fetchNextPage();
    });

    // page2 is still pending — isFetchingNextPage must be true
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));

    act(() => {
      resolvePage2({ data: page2, cursor: null });
    });

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    expect(result.current.todos).toEqual([...page1, ...page2]);
    expect(result.current.hasNextPage).toBe(false);
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining(`cursor=${cursor}`),
      undefined,
    );
  });
});
