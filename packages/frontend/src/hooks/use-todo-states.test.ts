import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTodoStates } from "./use-todo-states.js";

describe("useTodoStates", () => {
  it("returns 'confirmed' for unknown IDs", () => {
    const { result } = renderHook(() => useTodoStates());
    expect(result.current.getTodoState("unknown-id")).toBe("confirmed");
  });

  it("setTodoState updates state, getTodoState reflects change", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
    });

    expect(result.current.getTodoState("id-1")).toBe("syncing");
  });

  it("clearTodoState removes entry and state returns to confirmed", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "transient-error" });
    });
    act(() => {
      result.current.clearTodoState("id-1");
    });

    expect(result.current.getTodoState("id-1")).toBe("confirmed");
  });

  it("getErrorMessage returns message for error states", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "permanent-error", errorMessage: "Bad input" });
    });

    expect(result.current.getErrorMessage("id-1")).toBe("Bad input");
  });

  it("getErrorMessage returns undefined for unknown IDs", () => {
    const { result } = renderHook(() => useTodoStates());
    expect(result.current.getErrorMessage("unknown-id")).toBeUndefined();
  });

  it("getErrorMessage returns undefined when no errorMessage stored", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
    });

    expect(result.current.getErrorMessage("id-1")).toBeUndefined();
  });

  it("handles multiple independent IDs", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
      result.current.setTodoState("id-2", { state: "permanent-error", errorMessage: "Error" });
    });

    expect(result.current.getTodoState("id-1")).toBe("syncing");
    expect(result.current.getTodoState("id-2")).toBe("permanent-error");
    expect(result.current.getErrorMessage("id-2")).toBe("Error");
    expect(result.current.getErrorMessage("id-1")).toBeUndefined();
  });

  it("clearing one ID does not affect others", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
      result.current.setTodoState("id-2", { state: "syncing" });
    });
    act(() => {
      result.current.clearTodoState("id-1");
    });

    expect(result.current.getTodoState("id-1")).toBe("confirmed");
    expect(result.current.getTodoState("id-2")).toBe("syncing");
  });

  it("setTodoState overwrites existing state", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
    });
    act(() => {
      result.current.setTodoState("id-1", { state: "transient-error" });
    });

    expect(result.current.getTodoState("id-1")).toBe("transient-error");
  });

  it("setTodoState stores pendingOperation alongside state", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", {
        state: "transient-error",
        errorMessage: "Timeout",
        pendingOperation: { type: "create", args: { id: "id-1", text: "Test" } },
      });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry).toEqual({
      state: "transient-error",
      errorMessage: "Timeout",
      pendingOperation: { type: "create", args: { id: "id-1", text: "Test" } },
    });
  });

  it("getTodoStateEntry returns full entry with pendingOperation", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", {
        state: "transient-error",
        pendingOperation: { type: "toggle", args: { id: "id-1", completed: true } },
      });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.pendingOperation?.type).toBe("toggle");
  });

  it("getTodoStateEntry returns undefined for unknown IDs", () => {
    const { result } = renderHook(() => useTodoStates());
    expect(result.current.getTodoStateEntry("unknown-id")).toBeUndefined();
  });

  it("clearTodoState removes pendingOperation", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", {
        state: "transient-error",
        pendingOperation: { type: "delete", args: { id: "id-1" } },
      });
    });
    act(() => {
      result.current.clearTodoState("id-1");
    });

    expect(result.current.getTodoStateEntry("id-1")).toBeUndefined();
  });
});
