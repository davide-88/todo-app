import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  // wasConfirmed tracking tests
  it("setTodoState defaults wasConfirmed to false when not specified", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.wasConfirmed).toBe(false);
  });

  it("setTodoState stores wasConfirmed: true when explicitly set", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing", wasConfirmed: true });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.wasConfirmed).toBe(true);
  });

  it("getTodoStateEntry returns undefined for unknown IDs", () => {
    const { result } = renderHook(() => useTodoStates());
    expect(result.current.getTodoStateEntry("unknown")).toBeUndefined();
  });

  it("getTodoStateEntry returns full entry including wasConfirmed and pendingOperation", () => {
    const { result } = renderHook(() => useTodoStates());
    const pendingOp = { type: "create" as const, args: { id: "id-1", text: "hello" } };

    act(() => {
      result.current.setTodoState("id-1", {
        state: "syncing",
        wasConfirmed: false,
        pendingOperation: pendingOp,
      });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.state).toBe("syncing");
    expect(entry?.wasConfirmed).toBe(false);
    expect(entry?.pendingOperation).toEqual(pendingOp);
  });

  it("wasConfirmed persists from syncing through error transition when explicitly set", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", {
        state: "syncing",
        wasConfirmed: true,
        pendingOperation: { type: "toggle", args: { id: "id-1", completed: true } },
      });
    });

    act(() => {
      result.current.setTodoState("id-1", {
        state: "transient-error",
        wasConfirmed: true,
        pendingOperation: { type: "toggle", args: { id: "id-1", completed: true } },
      });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.wasConfirmed).toBe(true);
    expect(entry?.pendingOperation?.type).toBe("toggle");
  });

  it("wasConfirmed stays false for create that never confirmed", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", {
        state: "syncing",
        wasConfirmed: false,
        pendingOperation: { type: "create", args: { id: "id-1", text: "hello" } },
      });
    });

    act(() => {
      result.current.setTodoState("id-1", {
        state: "transient-error",
        wasConfirmed: false,
        pendingOperation: { type: "create", args: { id: "id-1", text: "hello" } },
      });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.wasConfirmed).toBe(false);
  });

  it("setTodoState preserves previous wasConfirmed when not explicitly provided", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing", wasConfirmed: true });
    });

    act(() => {
      result.current.setTodoState("id-1", { state: "transient-error" });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.wasConfirmed).toBe(true);
  });

  it("setTodoState defaults wasConfirmed to false when no previous entry exists", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing" });
    });

    const entry = result.current.getTodoStateEntry("id-1");
    expect(entry?.wasConfirmed).toBe(false);
  });

  it("clearTodoState removes entry; getTodoStateEntry returns undefined", () => {
    const { result } = renderHook(() => useTodoStates());

    act(() => {
      result.current.setTodoState("id-1", { state: "syncing", wasConfirmed: true });
    });
    act(() => {
      result.current.clearTodoState("id-1");
    });

    expect(result.current.getTodoStateEntry("id-1")).toBeUndefined();
  });
});
