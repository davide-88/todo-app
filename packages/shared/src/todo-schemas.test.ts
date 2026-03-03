import Value from "typebox/value";
import { describe, it, expect } from "vitest";
import {
  Todo,
  CreateTodo,
  UpdateTodo,
  TodoListQuery,
  TodoListResponse,
} from "./todo-schemas.js";

const validUuid = crypto.randomUUID();
const validDate = new Date().toISOString();

describe("Todo schema", () => {
  it("accepts a valid todo", () => {
    expect(
      Value.Check(Todo, {
        id: validUuid,
        text: "Buy milk",
        completed: false,
        createdAt: validDate,
        updatedAt: validDate,
      }),
    ).toBe(true);
  });

  it("rejects missing id", () => {
    expect(
      Value.Check(Todo, {
        text: "Buy milk",
        completed: false,
        createdAt: validDate,
        updatedAt: validDate,
      }),
    ).toBe(false);
  });

  it("rejects invalid uuid format", () => {
    expect(
      Value.Check(Todo, {
        id: "not-a-uuid",
        text: "Buy milk",
        completed: false,
        createdAt: validDate,
        updatedAt: validDate,
      }),
    ).toBe(false);
  });

  it("rejects empty text", () => {
    expect(
      Value.Check(Todo, {
        id: validUuid,
        text: "",
        completed: false,
        createdAt: validDate,
        updatedAt: validDate,
      }),
    ).toBe(false);
  });

  it("rejects text over maxTextLength", () => {
    expect(
      Value.Check(Todo, {
        id: validUuid,
        text: "x".repeat(501),
        completed: false,
        createdAt: validDate,
        updatedAt: validDate,
      }),
    ).toBe(false);
  });
});

describe("CreateTodo schema", () => {
  it("accepts valid payload", () => {
    expect(
      Value.Check(CreateTodo, { id: crypto.randomUUID(), text: "Buy milk" }),
    ).toBe(true);
  });

  it("rejects empty text", () => {
    expect(
      Value.Check(CreateTodo, { id: crypto.randomUUID(), text: "" }),
    ).toBe(false);
  });

  it("rejects text over maxTextLength", () => {
    expect(
      Value.Check(CreateTodo, {
        id: crypto.randomUUID(),
        text: "x".repeat(501),
      }),
    ).toBe(false);
  });

  it("rejects missing id", () => {
    expect(Value.Check(CreateTodo, { text: "Buy milk" })).toBe(false);
  });
});

describe("UpdateTodo schema", () => {
  it("accepts completed: true", () => {
    expect(Value.Check(UpdateTodo, { completed: true })).toBe(true);
  });

  it("accepts completed: false", () => {
    expect(Value.Check(UpdateTodo, { completed: false })).toBe(true);
  });

  it("rejects missing completed", () => {
    expect(Value.Check(UpdateTodo, {})).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(
      Value.Check(UpdateTodo, { completed: true, text: "extra" }),
    ).toBe(false);
  });
});

describe("TodoListQuery schema", () => {
  it("accepts empty object (all optional)", () => {
    expect(Value.Check(TodoListQuery, {})).toBe(true);
  });

  it("accepts valid status filter", () => {
    expect(Value.Check(TodoListQuery, { status: "active" })).toBe(true);
    expect(Value.Check(TodoListQuery, { status: "completed" })).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(Value.Check(TodoListQuery, { status: "invalid" })).toBe(false);
  });

  it("accepts valid order", () => {
    expect(Value.Check(TodoListQuery, { order: "asc" })).toBe(true);
    expect(Value.Check(TodoListQuery, { order: "desc" })).toBe(true);
  });

  it("rejects invalid order", () => {
    expect(Value.Check(TodoListQuery, { order: "invalid" })).toBe(false);
  });

  it("accepts cursor string", () => {
    expect(Value.Check(TodoListQuery, { cursor: "some-cursor" })).toBe(true);
  });

  it("accepts integer limit", () => {
    expect(Value.Check(TodoListQuery, { limit: 10 })).toBe(true);
  });
});

describe("TodoListResponse schema", () => {
  it("accepts valid response with null cursor", () => {
    expect(
      Value.Check(TodoListResponse, {
        data: [
          {
            id: validUuid,
            text: "Buy milk",
            completed: false,
            createdAt: validDate,
            updatedAt: validDate,
          },
        ],
        cursor: null,
      }),
    ).toBe(true);
  });

  it("accepts valid response with string cursor", () => {
    expect(
      Value.Check(TodoListResponse, {
        data: [],
        cursor: "next-page-cursor",
      }),
    ).toBe(true);
  });

  it("accepts empty data array", () => {
    expect(Value.Check(TodoListResponse, { data: [], cursor: null })).toBe(
      true,
    );
  });

  it("rejects missing data", () => {
    expect(Value.Check(TodoListResponse, { cursor: null })).toBe(false);
  });
});
