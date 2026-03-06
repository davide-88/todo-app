import { ApiFetchError } from "@/lib/api-fetch.js";
import type { Todo, TodoUiState } from "@todo-app/shared";
import type { PendingOperation } from "@/hooks/use-todo-states.js";

export type TodoPage = { data: Todo[]; cursor: string | null };
export type TodoInfiniteData = { pages: TodoPage[]; pageParams: unknown[] };

export interface TodoMutationCallbacks {
  setTodoState: (
    id: string,
    entry: {
      state: TodoUiState;
      errorMessage?: string;
      wasConfirmed?: boolean;
      pendingOperation?: PendingOperation;
    },
  ) => void;
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
    return { state: "transient-error", errorMessage: error.message };
  }
  if (error instanceof Error) {
    return { state: "transient-error", errorMessage: error.message };
  }
  return { state: "transient-error" };
}
