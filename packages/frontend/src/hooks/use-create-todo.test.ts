import { createApiFetchMock, makeQueryClient, makeWrapper, QUERY_KEY } from "@/test-utils/mock-api.js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateTodo } from "./use-create-todo.js";
import { useTodoStates } from "./use-todo-states.js";

vi.mock("@/lib/api-fetch.js", () => createApiFetchMock());

import { apiFetch, ApiFetchError } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

const makeTodo = (id: string, text: string) => ({
  id,
  text,
  completed: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCreateTodo", () => {
  it("inserts optimistic todo at top of first page on mutate", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("existing", "Existing")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockReturnValue(new Promise(() => { }));

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(
        QUERY_KEY,
      );
      expect(data?.pages[0]?.data[0]?.id).toBe("new-id");
    });
  });

  it("sets syncing state with wasConfirmed=false and pendingOperation on mutate", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockReturnValue(new Promise(() => { }));

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => {
      expect(setTodoState).toHaveBeenCalledWith("new-id", {
        state: "syncing",
        wasConfirmed: false,
        pendingOperation: { type: "create", args: { id: "new-id", text: "New todo" } },
      });
    });
  });

  it("clears todo state and invalidates queries on success", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    const serverTodo = makeTodo("new-id", "New todo");
    mockApiFetch.mockResolvedValueOnce(serverTodo);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("new-id");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["todos"] });
    });
  });

  it("keeps optimistic todo in cache on error (no rollback)", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [makeTodo("existing", "Existing")], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(
      QUERY_KEY,
    );
    expect(data?.pages[0]?.data.some((t) => t.id === "new-id")).toBe(true);
  });

  it("does not invalidate queries on error", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("classifies 400 VALIDATION_ERROR as permanent-error with wasConfirmed=false and pendingOperation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("VALIDATION_ERROR", "Text too long", undefined, 400),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(setTodoState).toHaveBeenLastCalledWith("new-id", {
      state: "permanent-error",
      errorMessage: "Text too long",
      wasConfirmed: false,
      pendingOperation: { type: "create", args: { id: "new-id", text: "New todo" } },
    });
  });

  it("classifies 422 error as permanent-error", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("UNKNOWN_ERROR", "Unprocessable", undefined, 422),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(setTodoState).toHaveBeenLastCalledWith(
      "new-id",
      expect.objectContaining({ state: "permanent-error", wasConfirmed: false }),
    );
  });

  it("classifies NETWORK_ERROR as transient-error with wasConfirmed=false and pendingOperation", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(setTodoState).toHaveBeenLastCalledWith("new-id", {
      state: "transient-error",
      errorMessage: "Network failed",
      wasConfirmed: false,
      pendingOperation: { type: "create", args: { id: "new-id", text: "New todo" } },
    });
  });

  it("classifies 500 error as transient-error", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("INTERNAL_ERROR", "Server error", undefined, 500),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(setTodoState).toHaveBeenLastCalledWith(
      "new-id",
      expect.objectContaining({ state: "transient-error", wasConfirmed: false }),
    );
  });

  it("treats unknown error as transient (safe default)", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(new Error("Some unknown error"));

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(setTodoState).toHaveBeenLastCalledWith(
      "new-id",
      expect.objectContaining({ state: "transient-error", wasConfirmed: false }),
    );
  });

  it("classifies 429 rate-limited error as transient-error", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("RATE_LIMITED", "Too many requests", undefined, 429),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(setTodoState).toHaveBeenLastCalledWith(
      "new-id",
      expect.objectContaining({ state: "transient-error", wasConfirmed: false }),
    );
  });

  it("5 rapid concurrent creates each produce independent optimistic entries", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();

    for (let i = 1; i <= 5; i++) {
      mockApiFetch.mockResolvedValueOnce(makeTodo(`id-${i}`, `Todo ${i}`));
    }

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      for (let i = 1; i <= 5; i++) {
        result.current.mutate({ id: `id-${i}`, text: `Todo ${i}` });
      }
    });

    await waitFor(() => {
      for (let i = 1; i <= 5; i++) {
        expect(setTodoState).toHaveBeenCalledWith(
          `id-${i}`,
          expect.objectContaining({ state: "syncing", wasConfirmed: false }),
        );
      }
    });

    await waitFor(() => {
      for (let i = 1; i <= 5; i++) {
        expect(clearTodoState).toHaveBeenCalledWith(`id-${i}`);
      }
    });
  });

  it("integration: 400 VALIDATION_ERROR -> useTodoStates stores permanent-error + errorMessage", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("VALIDATION_ERROR", "Text exceeds maximum length", undefined, 400),
    );

    const { result } = renderHook(
      () => {
        const { setTodoState, clearTodoState, getTodoState, getErrorMessage, getTodoStateEntry } = useTodoStates();
        const mutation = useCreateTodo({ setTodoState, clearTodoState });
        return { mutation, getTodoState, getErrorMessage, getTodoStateEntry };
      },
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutation.mutate({ id: "new-id", text: "A long todo text" });
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    expect(result.current.getTodoState("new-id")).toBe("permanent-error");
    expect(result.current.getErrorMessage("new-id")).toBe("Text exceeds maximum length");
    expect(result.current.getTodoStateEntry("new-id")?.wasConfirmed).toBe(false);
  });

  it("retry after failure does not duplicate the optimistic todo in cache", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();

    // First attempt fails
    mockApiFetch.mockRejectedValueOnce(
      new ApiFetchError("NETWORK_ERROR", "Network failed", undefined, 0),
    );

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "retry-id", text: "Retry todo" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Optimistic todo should be in cache (no rollback on create error)
    let data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    expect(data?.pages[0]?.data.filter((t) => t.id === "retry-id")).toHaveLength(1);

    // Retry: same mutation with same ID
    mockApiFetch.mockResolvedValueOnce(makeTodo("retry-id", "Retry todo"));

    act(() => {
      result.current.mutate({ id: "retry-id", text: "Retry todo" });
    });

    await waitFor(() => {
      expect(clearTodoState).toHaveBeenCalledWith("retry-id");
    });

    // Must still be exactly 1 entry — not duplicated
    data = queryClient.getQueryData<{ pages: { data: { id: string }[] }[] }>(QUERY_KEY);
    const matches = data?.pages.flatMap((p) => p.data).filter((t) => t.id === "retry-id");
    expect(matches).toHaveLength(1);
  });
});
