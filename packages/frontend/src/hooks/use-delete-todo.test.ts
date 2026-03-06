import { createApiFetchMock, makeQueryClient, makeTodo, makeWrapper, QUERY_KEY } from "@/test-utils/mock-api.js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteTodo } from "./use-delete-todo.js";

vi.mock("@/lib/api-fetch.js", () => createApiFetchMock());

import { apiFetch, ApiFetchError } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

const makeCallbacks = (overrides?: { wasConfirmed?: boolean }) => ({
  setTodoState: vi.fn(),
  clearTodoState: vi.fn(),
  getTodoStateEntry: vi.fn().mockReturnValue({
    wasConfirmed: overrides?.wasConfirmed ?? true,
    state: "transient-error",
  }),
});

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

    const callbacks = makeCallbacks();
    mockApiFetch.mockReturnValue(new Promise(() => { }));

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
      const ids = data?.pages[0]?.data.map((t) => t.id);
      expect(ids).not.toContain("a");
      expect(ids).toContain("b");
    });
    expect(callbacks.setTodoState).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ state: "syncing", wasConfirmed: true }),
    );
  });

  it("successful delete → todo stays removed, state cleared", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks();
    mockApiFetch.mockResolvedValueOnce(undefined);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    await waitFor(() => {
      expect(callbacks.clearTodoState).toHaveBeenCalledWith("a");
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["todos"] });
  });

  it("transient error → todo reappears in original position + transient-error state", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    const ids = data?.pages[0]?.data.map((t) => t.id);
    expect(ids).toContain("a");
    expect(callbacks.setTodoState).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({ state: "transient-error", wasConfirmed: true }),
    );
  });

  it("permanent error → todo reappears + permanent-error state with message", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("VALIDATION_ERROR", "Permanent failure", undefined, 400),
    );

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data.some((t) => t.id === "a")).toBe(true);
    expect(callbacks.setTodoState).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({ state: "permanent-error", errorMessage: "Permanent failure" }),
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

    const callbacks = makeCallbacks();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("b");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

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

    const callbacks = makeCallbacks();
    mockApiFetch.mockResolvedValueOnce(undefined);
    mockApiFetch.mockResolvedValueOnce(undefined);

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
      result.current.handleDelete("c");
    });

    await waitFor(() => {
      expect(callbacks.clearTodoState).toHaveBeenCalledWith("a");
      expect(callbacks.clearTodoState).toHaveBeenCalledWith("c");
    });

    expect(callbacks.setTodoState).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ state: "syncing" }),
    );
    expect(callbacks.setTodoState).toHaveBeenCalledWith(
      "c",
      expect.objectContaining({ state: "syncing" }),
    );
  });

  // wasConfirmed conditional DELETE tests (AC 5 & 6)
  it("unconfirmed todo delete: no DELETE request, just clearTodoState (AC 5)", () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks({ wasConfirmed: false });

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(callbacks.clearTodoState).toHaveBeenCalledWith("a");
  });

  it("confirmed todo delete: DELETE request sent (AC 6)", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks({ wasConfirmed: true });
    mockApiFetch.mockResolvedValueOnce(undefined);

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    await waitFor(() => expect(callbacks.clearTodoState).toHaveBeenCalledWith("a"));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/todos/a", { method: "DELETE" });
  });

  it("unconfirmed todo delete: row removed from cache with no server call (AC 5)", () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a"), makeTodo("b")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks({ wasConfirmed: false });

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(callbacks.clearTodoState).toHaveBeenCalledWith("a");
    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data.map((t) => t.id)).toEqual(["b"]);
  });

  it("error response on delete stores pendingOperation for retry", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("a")], cursor: null }],
      pageParams: [undefined],
    });

    const callbacks = makeCallbacks({ wasConfirmed: true });
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useDeleteTodo(callbacks),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.handleDelete("a");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(callbacks.setTodoState).toHaveBeenLastCalledWith("a", {
      state: "transient-error",
      errorMessage: "Network failed",
      wasConfirmed: true,
      pendingOperation: { type: "delete", args: { id: "a" } },
    });
  });
});
