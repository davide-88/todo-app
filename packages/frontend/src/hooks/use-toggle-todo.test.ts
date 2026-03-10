import {
  createApiFetchMock,
  makeQueryClient,
  makeTodo,
  makeWrapper,
  QUERY_KEY,
} from "@/test-utils/mock-api.js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useToggleTodo } from "./use-toggle-todo.js";

vi.mock("@/lib/api-fetch.js", () => createApiFetchMock());

import { apiFetch, ApiFetchError } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useToggleTodo", () => {
  it("optimistically toggles false → true in cache", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", false)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        pages: { data: { id: string; completed: boolean }[] }[];
      }>(QUERY_KEY);
      expect(data?.pages[0]?.data[0]?.completed).toBe(true);
    });
    expect(setTodoState).toHaveBeenCalledWith("a", {
      state: "syncing",
      wasConfirmed: true,
      pendingOperation: { type: "toggle", args: { id: "a", completed: true } },
    });
  });

  it("optimistically toggles true → false in cache", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", true)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: false });
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        pages: { data: { id: string; completed: boolean }[] }[];
      }>(QUERY_KEY);
      expect(data?.pages[0]?.data[0]?.completed).toBe(false);
    });
  });

  it("successful toggle → todo removed from cache, state cleared (no invalidateQueries)", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", false)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockResolvedValueOnce(makeTodo("a", true));

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("a");
    });
    // Todo is removed from cache via setQueriesData (not via invalidateQueries)
    const data = queryClient.getQueryData<{
      pages: { data: { id: string }[] }[];
    }>(QUERY_KEY);
    expect(data?.pages[0]?.data.find((t) => t.id === "a")).toBeUndefined();
    // invalidateQueries must NOT be called — it would reset pagination
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("transient error → rollback to previous value + transient-error state with wasConfirmed=true and pendingOperation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", false)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<{
      pages: { data: { id: string; completed: boolean }[] }[];
    }>(QUERY_KEY);
    expect(data?.pages[0]?.data[0]?.completed).toBe(false);
    expect(setTodoState).toHaveBeenLastCalledWith("a", {
      state: "transient-error",
      errorMessage: "Network failed",
      wasConfirmed: true,
      pendingOperation: { type: "toggle", args: { id: "a", completed: true } },
    });
  });

  it("permanent error (400) → rollback to previous value + permanent-error state with wasConfirmed=true", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", true)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("VALIDATION_ERROR", "Bad input", undefined, 400),
    );

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<{
      pages: { data: { id: string; completed: boolean }[] }[];
    }>(QUERY_KEY);
    expect(data?.pages[0]?.data[0]?.completed).toBe(true);
    expect(setTodoState).toHaveBeenLastCalledWith("a", {
      state: "permanent-error",
      errorMessage: "Bad input",
      wasConfirmed: true,
      pendingOperation: { type: "toggle", args: { id: "a", completed: false } },
    });
  });

  it("429 rate limited → transient-error with wasConfirmed=true", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", false)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("RATE_LIMITED", "Too many requests", undefined, 429),
    );

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(setTodoState).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({ state: "transient-error", wasConfirmed: true }),
    );
  });

  it("NETWORK_ERROR → transient-error (error classification reuse)", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", false)], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network error", undefined, 0),
    );

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(setTodoState).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({ state: "transient-error", wasConfirmed: true }),
    );
  });

  it("successful toggle preserves pages 2+ in cache (pagination stability)", async () => {
    const queryClient = makeQueryClient();
    const altKey = ["todos", { status: "active", order: "desc" }];
    const twoPages = {
      pages: [
        {
          data: [makeTodo("a", false), makeTodo("b", false)],
          cursor: "cursor-1",
        },
        { data: [makeTodo("c", false), makeTodo("d", false)], cursor: null },
      ],
      pageParams: [undefined, "cursor-1"],
    };
    queryClient.setQueryData(QUERY_KEY, twoPages);
    queryClient.setQueryData(altKey, twoPages);

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockResolvedValueOnce(makeTodo("a", true));

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("a");
    });

    // toggled todo removed from primary key, pages preserved
    const data = queryClient.getQueryData<{
      pages: { data: { id: string }[] }[];
    }>(QUERY_KEY);
    expect(data?.pages[0]?.data.find((t) => t.id === "a")).toBeUndefined();
    expect(data?.pages).toHaveLength(2);
    expect(data?.pages[1]?.data.map((t) => t.id)).toContain("c");

    // secondary cache key also preserves both pages
    const data2 = queryClient.getQueryData<{
      pages: { data: { id: string }[] }[];
    }>(altKey);
    expect(data2?.pages).toHaveLength(2);

    // invalidateQueries must NOT be called — it would reset pagination
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("concurrent toggles on different todos → independent states", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [
        { data: [makeTodo("a", false), makeTodo("b", true)], cursor: null },
      ],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockResolvedValueOnce(makeTodo("a", true));
    mockApiFetch.mockResolvedValueOnce(makeTodo("b", false));

    const { result } = renderHook(
      () => useToggleTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a", completed: true });
      result.current.mutate({ id: "b", completed: false });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("a");
      expect(clearTodoState).toHaveBeenCalledWith("b");
    });

    expect(setTodoState).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ state: "syncing", wasConfirmed: true }),
    );
    expect(setTodoState).toHaveBeenCalledWith(
      "b",
      expect.objectContaining({ state: "syncing", wasConfirmed: true }),
    );
  });
});
