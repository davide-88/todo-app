import type { Todo } from "@todo-app/shared";

export interface FindManyOptions {
  status?: "active" | "completed";
  order?: "asc" | "desc";
  cursor?: Date;
  limit: number;
}

export interface TodoRepository {
  create(todo: { id: string; text: string }): Promise<Todo>;
  findMany(options: FindManyOptions): Promise<Todo[]>;
  update(id: string, data: { completed: boolean }): Promise<Todo | null>;
  delete(id: string): Promise<void>;
  healthCheck(): Promise<void>;
}
