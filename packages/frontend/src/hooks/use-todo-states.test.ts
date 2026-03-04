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
});
