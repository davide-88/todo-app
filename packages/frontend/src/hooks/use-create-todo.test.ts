import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createApiFetchMock, makeQueryClient, makeWrapper, QUERY_KEY } from "@/test-utils/mock-api.js";
import { useCreateTodo } from "./use-create-todo.js";

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
    mockApiFetch.mockReturnValue(new Promise(() => {}));

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

  it("sets syncing state for new todo on mutate", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ id: "new-id", text: "New todo" });
    });

    await waitFor(() => {
      expect(setTodoState).toHaveBeenCalledWith("new-id", { state: "syncing" });
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

  it("classifies 400 VALIDATION_ERROR as permanent-error with message", async () => {
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
      expect.objectContaining({ state: "permanent-error" }),
    );
  });

  it("classifies NETWORK_ERROR as transient-error", async () => {
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

    expect(setTodoState).toHaveBeenLastCalledWith("new-id", { state: "transient-error" });
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

    expect(setTodoState).toHaveBeenLastCalledWith("new-id", { state: "transient-error" });
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

    expect(setTodoState).toHaveBeenLastCalledWith("new-id", { state: "transient-error" });
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

    expect(setTodoState).toHaveBeenLastCalledWith("new-id", { state: "transient-error" });
  });

  it("5 rapid concurrent creates each produce independent optimistic entries", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEY, {
      pages: [{ data: [], cursor: null }],
      pageParams: [undefined],
    });

    const setTodoState = vi.fn();
    const clearTodoState = vi.fn();

    // All 5 mutations resolve asynchronously
    for (let i = 1; i <= 5; i++) {
      mockApiFetch.mockResolvedValueOnce(makeTodo(`id-${i}`, `Todo ${i}`));
    }

    const { result } = renderHook(
      () => useCreateTodo({ setTodoState, clearTodoState }),
      { wrapper: makeWrapper(queryClient) },
    );

    // Fire all 5 without awaiting — rapid succession
    act(() => {
      for (let i = 1; i <= 5; i++) {
        result.current.mutate({ id: `id-${i}`, text: `Todo ${i}` });
      }
    });

    // All 5 should have syncing state set
    await waitFor(() => {
      for (let i = 1; i <= 5; i++) {
        expect(setTodoState).toHaveBeenCalledWith(`id-${i}`, { state: "syncing" });
      }
    });

    // All 5 should eventually clear
    await waitFor(() => {
      for (let i = 1; i <= 5; i++) {
        expect(clearTodoState).toHaveBeenCalledWith(`id-${i}`);
      }
    });
  });
});
