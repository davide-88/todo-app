import Type from "typebox";
import { maxTextLength } from "./constants.js";

export const Todo = Type.Object({
  id: Type.String({ format: "uuid" }),
  text: Type.String({ minLength: 1, maxLength: maxTextLength }),
  completed: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});
export type Todo = Type.Static<typeof Todo>;

export const CreateTodo = Type.Object({
  id: Type.String({ format: "uuid" }),
  text: Type.String({ minLength: 1, maxLength: maxTextLength }),
});
export type CreateTodo = Type.Static<typeof CreateTodo>;

export const UpdateTodo = Type.Object(
  {
    completed: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type UpdateTodo = Type.Static<typeof UpdateTodo>;

export const TodoListQuery = Type.Object({
  status: Type.Optional(
    Type.Union([Type.Literal("active"), Type.Literal("completed")]),
  ),
  order: Type.Optional(
    Type.Union([Type.Literal("asc"), Type.Literal("desc")]),
  ),
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer()),
});
export type TodoListQuery = Type.Static<typeof TodoListQuery>;

export const TodoListResponse = Type.Object({
  data: Type.Array(Todo),
  cursor: Type.Union([Type.String(), Type.Null()]),
});
export type TodoListResponse = Type.Static<typeof TodoListResponse>;
