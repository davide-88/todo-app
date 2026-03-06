import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createApiFetchMock, makeQueryClient, makeWrapper, makeTodo, QUERY_KEY } from "@/test-utils/mock-api.js";
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
      const data = queryClient.getQueryData<{ pages: { data: { id: string; completed: boolean }[] }[] }>(QUERY_KEY);
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
      const data = queryClient.getQueryData<{ pages: { data: { id: string; completed: boolean }[] }[] }>(QUERY_KEY);
      expect(data?.pages[0]?.data[0]?.completed).toBe(false);
    });
  });

  it("successful toggle → cache invalidated, state cleared", async () => {
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
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["todos"] });
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

    const data = queryClient.getQueryData<{ pages: { data: { id: string; completed: boolean }[] }[] }>(QUERY_KEY);
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

    const data = queryClient.getQueryData<{ pages: { data: { id: string; completed: boolean }[] }[] }>(QUERY_KEY);
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

  it("concurrent toggles on different todos → independent states", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a", false), makeTodo("b", true)], cursor: null }],
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
