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
    expect(setTodoState).toHaveBeenCalledWith("a", { state: "syncing" });
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

  it("transient error → rollback to previous value + transient-error state", async () => {
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

    // Cache must be rolled back to original false
    const data = queryClient.getQueryData<{ pages: { data: { id: string; completed: boolean }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data[0]?.completed).toBe(false);
    expect(setTodoState).toHaveBeenLastCalledWith("a", { state: "transient-error" });
  });

  it("permanent error (400) → rollback to previous value + permanent-error state with message", async () => {
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

    // Rolled back to original true
    const data = queryClient.getQueryData<{ pages: { data: { id: string; completed: boolean }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data[0]?.completed).toBe(true);
    expect(setTodoState).toHaveBeenLastCalledWith("a", {
      state: "permanent-error",
      errorMessage: "Bad input",
    });
  });

  it("429 rate limited → transient-error", async () => {
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
    expect(setTodoState).toHaveBeenLastCalledWith("a", { state: "transient-error" });
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
    expect(setTodoState).toHaveBeenLastCalledWith("a", { state: "transient-error" });
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

    expect(setTodoState).toHaveBeenCalledWith("a", { state: "syncing" });
    expect(setTodoState).toHaveBeenCalledWith("b", { state: "syncing" });
  });
});
