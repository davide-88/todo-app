import { ApiFetchError } from "@/lib/api-fetch.js";
import type { Todo, TodoUiState } from "@todo-app/shared";

export type TodoPage = { data: Todo[]; cursor: string | null };
export type TodoInfiniteData = { pages: TodoPage[]; pageParams: unknown[] };

export interface TodoMutationCallbacks {
  setTodoState: (id: string, entry: { state: TodoUiState; errorMessage?: string }) => void;
  clearTodoState: (id: string) => void;
}

export function classifyError(error: unknown): { state: TodoUiState; errorMessage?: string } {
  if (error instanceof ApiFetchError) {
    const isPermanent =
      error.status === 400 ||
      error.status === 404 ||
      error.status === 422 ||
      error.code === "VALIDATION_ERROR";
    if (isPermanent) {
      return { state: "permanent-error", errorMessage: error.message };
    }
  }
  return { state: "transient-error" };
}
