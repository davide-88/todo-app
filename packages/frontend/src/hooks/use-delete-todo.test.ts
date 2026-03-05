import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createApiFetchMock, makeQueryClient, makeWrapper, makeTodo, QUERY_KEY } from "@/test-utils/mock-api.js";
import { useDeleteTodo } from "./use-delete-todo.js";

vi.mock("@/lib/api-fetch.js", () => createApiFetchMock());

import { apiFetch, ApiFetchError } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDeleteTodo", () => {
  it("optimistically removes todo from cache on mutate", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useDeleteTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a" });
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
      const ids = data?.pages[0]?.data.map((t) => t.id);
      expect(ids).not.toContain("a");
      expect(ids).toContain("b");
    });
    expect(setTodoState).toHaveBeenCalledWith("a", { state: "syncing" });
  });

  it("successful delete → todo stays removed, state cleared", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockResolvedValueOnce(undefined);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useDeleteTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a" });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("a");
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["todos"] });
  });

  it("transient error → todo reappears in original position + transient-error state", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useDeleteTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Todo must reappear
    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    const ids = data?.pages[0]?.data.map((t) => t.id);
    expect(ids).toContain("a");
    expect(setTodoState).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({
        state: "transient-error",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        pendingOperation: expect.objectContaining({ type: "delete" }),
      }),
    );
  });

  it("permanent error → todo reappears + permanent-error state with message", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("VALIDATION_ERROR", "Permanent failure", undefined, 400),
    );

    const { result } = renderHook(
      () => useDeleteTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data.some((t) => t.id === "a")).toBe(true);
    expect(setTodoState).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({
        state: "permanent-error",
        errorMessage: "Permanent failure",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        pendingOperation: expect.objectContaining({ type: "delete" }),
      }),
    );
  });

  it("delete from middle of paginated list → other items maintain position", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [
        { data: [makeTodo("a"), makeTodo("b"), makeTodo("c")], cursor: "cursor-1" },
        { data: [makeTodo("d"), makeTodo("e")], cursor: null },
      ],
      pageParams: [undefined, "cursor-1"],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useDeleteTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "b" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // All items restored in original positions
    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(data?.pages[1]?.data.map((t) => t.id)).toEqual(["d", "e"]);
  });

  it("concurrent deletes on different todos → independent handling", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b"), makeTodo("c")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockResolvedValueOnce(undefined);
    mockApiFetch.mockResolvedValueOnce(undefined);

    const { result } = renderHook(
      () => useDeleteTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "a" });
      result.current.mutate({ id: "c" });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("a");
      expect(clearTodoState).toHaveBeenCalledWith("c");
    });

    expect(setTodoState).toHaveBeenCalledWith("a", { state: "syncing" });
    expect(setTodoState).toHaveBeenCalledWith("c", { state: "syncing" });
  });
});
