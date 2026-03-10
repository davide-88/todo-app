import { describe, it, expect } from "vitest";
import { transitionTodoState } from "./todo-state-machine.js";

describe("transitionTodoState — allowed transitions", () => {
  it("confirmed + MUTATE → syncing", () => {
    expect(transitionTodoState("confirmed", "MUTATE")).toBe("syncing");
  });

  it("syncing + SUCCESS → confirmed", () => {
    expect(transitionTodoState("syncing", "SUCCESS")).toBe("confirmed");
  });

  it("syncing + TRANSIENT_ERROR → transient-error", () => {
    expect(transitionTodoState("syncing", "TRANSIENT_ERROR")).toBe(
      "transient-error",
    );
  });

  it("syncing + PERMANENT_ERROR → permanent-error", () => {
    expect(transitionTodoState("syncing", "PERMANENT_ERROR")).toBe(
      "permanent-error",
    );
  });

  it("transient-error + RETRY → syncing", () => {
    expect(transitionTodoState("transient-error", "RETRY")).toBe("syncing");
  });

  it("transient-error + MUTATE → syncing", () => {
    expect(transitionTodoState("transient-error", "MUTATE")).toBe("syncing");
  });
});

describe("transitionTodoState — disallowed transitions", () => {
  it("confirmed + SUCCESS → throws", () => {
    expect(() => transitionTodoState("confirmed", "SUCCESS")).toThrow(
      /Invalid transition/,
    );
  });

  it("confirmed + TRANSIENT_ERROR → throws", () => {
    expect(() => transitionTodoState("confirmed", "TRANSIENT_ERROR")).toThrow(
      /Invalid transition/,
    );
  });

  it("confirmed + PERMANENT_ERROR → throws", () => {
    expect(() => transitionTodoState("confirmed", "PERMANENT_ERROR")).toThrow(
      /Invalid transition/,
    );
  });

  it("confirmed + RETRY → throws", () => {
    expect(() => transitionTodoState("confirmed", "RETRY")).toThrow(
      /Invalid transition/,
    );
  });

  it("syncing + MUTATE → throws", () => {
    expect(() => transitionTodoState("syncing", "MUTATE")).toThrow(
      /Invalid transition/,
    );
  });

  it("syncing + RETRY → throws", () => {
    expect(() => transitionTodoState("syncing", "RETRY")).toThrow(
      /Invalid transition/,
    );
  });

  it("permanent-error + RETRY → throws", () => {
    expect(() => transitionTodoState("permanent-error", "RETRY")).toThrow(
      /Invalid transition/,
    );
  });

  it("permanent-error + MUTATE → throws", () => {
    expect(() => transitionTodoState("permanent-error", "MUTATE")).toThrow(
      /Invalid transition/,
    );
  });

  it("permanent-error + SUCCESS → throws", () => {
    expect(() => transitionTodoState("permanent-error", "SUCCESS")).toThrow(
      /Invalid transition/,
    );
  });

  it("permanent-error + TRANSIENT_ERROR → throws", () => {
    expect(() =>
      transitionTodoState("permanent-error", "TRANSIENT_ERROR"),
    ).toThrow(/Invalid transition/);
  });

  it("permanent-error + PERMANENT_ERROR → throws", () => {
    expect(() =>
      transitionTodoState("permanent-error", "PERMANENT_ERROR"),
    ).toThrow(/Invalid transition/);
  });

  it("transient-error + SUCCESS → throws", () => {
    expect(() => transitionTodoState("transient-error", "SUCCESS")).toThrow(
      /Invalid transition/,
    );
  });

  it("transient-error + TRANSIENT_ERROR → throws", () => {
    expect(() =>
      transitionTodoState("transient-error", "TRANSIENT_ERROR"),
    ).toThrow(/Invalid transition/);
  });

  it("transient-error + PERMANENT_ERROR → throws", () => {
    expect(() =>
      transitionTodoState("transient-error", "PERMANENT_ERROR"),
    ).toThrow(/Invalid transition/);
  });
});
