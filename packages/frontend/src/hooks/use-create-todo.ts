import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiFetchError } from "@/lib/api-fetch.js";
import type { Todo, CreateTodo, TodoUiState } from "@todo-app/shared";

interface CreateTodoCallbacks {
  setTodoState: (id: string, entry: { state: TodoUiState; errorMessage?: string }) => void;
  clearTodoState: (id: string) => void;
}

function classifyError(error: unknown): { state: TodoUiState; errorMessage?: string } {
  if (error instanceof ApiFetchError) {
    const isPermanent =
      error.status === 400 ||
      error.status === 422 ||
      error.code === "VALIDATION_ERROR";
    if (isPermanent) {
      return { state: "permanent-error", errorMessage: error.message };
    }
  }
  return { state: "transient-error" };
}

export function useCreateTodo({ setTodoState, clearTodoState }: CreateTodoCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTodo) => {
      return apiFetch<Todo>("/api/todos", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onMutate: async (input: CreateTodo) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      const previousData = queryClient.getQueriesData<{
        pages: { data: Todo[]; cursor: string | null }[];
      }>({ queryKey: ["todos"] });

      const optimisticTodo: Todo = {
        id: input.id,
        text: input.text,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<{
        pages: { data: Todo[]; cursor: string | null }[];
        pageParams: unknown[];
      }>(
        { queryKey: ["todos"] },
        (old) => {
          if (!old || !old.pages[0]) return old;
          const firstPage = old.pages[0];
          const newPages = [...old.pages];
          newPages[0] = {
            ...firstPage,
            data: [optimisticTodo, ...firstPage.data],
          };
          return { ...old, pages: newPages };
        },
      );

      setTodoState(input.id, { state: "syncing" });

      return { previousData, todoId: input.id };
    },
    onSuccess: (_data, input) => {
      // Server has the todo — safe to refetch, real version replaces optimistic
      void queryClient.invalidateQueries({ queryKey: ["todos"] });
      clearTodoState(input.id);
    },
    onError: (error, input) => {
      // CRITICAL: DO NOT rollback — keep optimistic todo visible for retry/delete (AC 3)
      // CRITICAL: DO NOT invalidate — refetch would remove local-only optimistic todo
      setTodoState(input.id, classifyError(error));
    },
  });
}
