import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch.js";
import { classifyError } from "@/lib/classify-error.js";
import type { TodoInfiniteData, TodoMutationCallbacks } from "@/lib/classify-error.js";
import type { Todo, CreateTodo } from "@todo-app/shared";

export function useCreateTodo({ setTodoState, clearTodoState }: TodoMutationCallbacks) {
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

      const previousData = queryClient.getQueriesData<TodoInfiniteData>({ queryKey: ["todos"] });

      const optimisticTodo: Todo = {
        id: input.id,
        text: input.text,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<TodoInfiniteData>(
        { queryKey: ["todos"] },
        (old) => {
          if (!old || !old.pages[0]) return old;
          const firstPage = old.pages[0];
          // Remove existing entry with same ID across all pages (handles retry after error)
          const filtered = old.pages.map((page) => ({
            ...page,
            data: page.data.filter((t) => t.id !== input.id),
          }));
          filtered[0] = {
            ...firstPage,
            data: [optimisticTodo, ...firstPage.data.filter((t) => t.id !== input.id)],
          };
          return { ...old, pages: filtered };
        },
      );

      setTodoState(input.id, {
        state: "syncing",
        wasConfirmed: false,
        pendingOperation: { type: "create", args: { id: input.id, text: input.text } },
      });

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
      setTodoState(input.id, {
        ...classifyError(error),
        wasConfirmed: false,
        pendingOperation: { type: "create", args: { id: input.id, text: input.text } },
      });
    },
  });
}
