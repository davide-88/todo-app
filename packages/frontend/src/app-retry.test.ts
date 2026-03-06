import { useCreateTodo } from "@/hooks/use-create-todo.js";
import { useDeleteTodo } from "@/hooks/use-delete-todo.js";
import type { PendingOperation } from "@/hooks/use-todo-states.js";
import { useTodoStates } from "@/hooks/use-todo-states.js";
import { useToggleTodo } from "@/hooks/use-toggle-todo.js";
import type { TodoInfiniteData } from "@/lib/classify-error.js";
import { makeQueryClient, makeTodo, makeWrapper, QUERY_KEY } from "@/test-utils/mock-api.js";
import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-fetch.js", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-fetch.js")>("@/lib/api-fetch.js");
  return { ...actual, apiFetch: vi.fn() };
});

import { apiFetch, ApiFetchError } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Integration test for the handleRetry flow as wired in app.tsx:
 * error → pendingOperation stored → retry reads it → correct mutation re-invoked
 */
describe("handleRetry integration", () => {
  function useRetryHarness() {
    const { getTodoStateEntry, setTodoState, clearTodoState } = useTodoStates();
    const createMutation = useCreateTodo({ setTodoState, clearTodoState });
    const toggleMutation = useToggleTodo({ setTodoState, clearTodoState });
    const deleteMutation = useDeleteTodo({ setTodoState, clearTodoState, getTodoStateEntry });

    const handleRetry = (id: string) => {
      const entry = getTodoStateEntry(id);
      if (!entry?.pendingOperation) return;
      const op: PendingOperation = entry.pendingOperation;
      switch (op.type) {
        case "create":
          createMutation.mutate(op.args);
          break;
        case "toggle":
          toggleMutation.mutate(op.args);
          break;
        case "delete":
          deleteMutation.mutate(op.args);
          break;
      }
    };

    const queryClient = useQueryClient();

    const handleDelete = (id: string) => {
      const entry = getTodoStateEntry(id);
      if (entry?.pendingOperation?.type === "create") {
        queryClient.setQueriesData<TodoInfiniteData>({ queryKey: ["todos"] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((t) => t.id !== id),
            })),
          };
        });
        clearTodoState(id);
        return;
      }
      deleteMutation.mutate({ id });
    };

    return { handleRetry, handleDelete, getTodoStateEntry, createMutation, toggleMutation, deleteMutation };
  }

  it("retry after failed create re-invokes createMutation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    // First call fails, second call succeeds
    mockApiFetch
      .mockRejectedValueOnce(new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0))
      .mockResolvedValueOnce(makeTodo("todo-1"));

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    // Trigger create that will fail
    act(() => {
      result.current.createMutation.mutate({ id: "todo-1", text: "Test todo" });
    });

    await waitFor(() => {
      const entry = result.current.getTodoStateEntry("todo-1");
      expect(entry?.state).toBe("transient-error");
      expect(entry?.pendingOperation?.type).toBe("create");
    });

    // Retry
    act(() => {
      result.current.handleRetry("todo-1");
    });

    // Should have called apiFetch twice (original + retry)
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("retry after failed toggle re-invokes toggleMutation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("todo-1", false)], cursor: null }],
      pageParams: [undefined],
    });

    mockApiFetch
      .mockRejectedValueOnce(new ApiFetchError("INTERNAL_ERROR", "Server error", undefined, 500))
      .mockResolvedValueOnce(makeTodo("todo-1", true));

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.toggleMutation.mutate({ id: "todo-1", completed: true });
    });

    await waitFor(() => {
      const entry = result.current.getTodoStateEntry("todo-1");
      expect(entry?.state).toBe("transient-error");
      expect(entry?.pendingOperation?.type).toBe("toggle");
    });

    act(() => {
      result.current.handleRetry("todo-1");
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("retry after failed delete re-invokes deleteMutation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("todo-1")], cursor: null }],
      pageParams: [undefined],
    });

    mockApiFetch
      .mockRejectedValueOnce(new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.deleteMutation.mutate({ id: "todo-1" });
    });

    await waitFor(() => {
      const entry = result.current.getTodoStateEntry("todo-1");
      expect(entry?.state).toBe("transient-error");
      expect(entry?.pendingOperation?.type).toBe("delete");
    });

    act(() => {
      result.current.handleRetry("todo-1");
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("handleRetry does nothing when no pendingOperation exists", () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    // No mutation was ever triggered — no pendingOperation
    act(() => {
      result.current.handleRetry("nonexistent-id");
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("successful retry clears error state", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("todo-1", false)], cursor: null }],
      pageParams: [undefined],
    });

    mockApiFetch
      .mockRejectedValueOnce(new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0))
      .mockResolvedValueOnce(makeTodo("todo-1", true));

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.toggleMutation.mutate({ id: "todo-1", completed: true });
    });

    await waitFor(() => {
      expect(result.current.getTodoStateEntry("todo-1")?.state).toBe("transient-error");
    });

    act(() => {
      result.current.handleRetry("todo-1");
    });

    await waitFor(() => {
      expect(result.current.getTodoStateEntry("todo-1")).toBeUndefined();
    });
  });

  it("deleting a local-only (never-persisted) todo removes it without API call", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    // Create fails
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.createMutation.mutate({ id: "local-todo", text: "Never persisted" });
    });

    await waitFor(() => {
      expect(result.current.getTodoStateEntry("local-todo")?.state).toBe("transient-error");
      expect(result.current.getTodoStateEntry("local-todo")?.pendingOperation?.type).toBe("create");
    });

    // Verify todo is in cache
    const before = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(before?.pages.flatMap((p) => p.data).some((t) => t.id === "local-todo")).toBe(true);

    mockApiFetch.mockClear();

    // Delete the local-only todo
    act(() => {
      result.current.handleDelete("local-todo");
    });

    // No API call should have been made
    expect(mockApiFetch).not.toHaveBeenCalled();

    // Todo removed from cache
    const after = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(after?.pages.flatMap((p) => p.data).some((t) => t.id === "local-todo")).toBe(false);

    // State cleared
    expect(result.current.getTodoStateEntry("local-todo")).toBeUndefined();
  });

  it("deleting a persisted todo still uses the delete mutation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("persisted-todo")], cursor: null }],
      pageParams: [undefined],
    });

    mockApiFetch.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryHarness(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.handleDelete("persisted-todo");
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });
});
