import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch.js";
import { classifyError } from "@/lib/classify-error.js";
import type { TodoInfiniteData, TodoMutationCallbacks } from "@/lib/classify-error.js";
import type { Todo } from "@todo-app/shared";

export function useToggleTodo({ setTodoState, clearTodoState }: TodoMutationCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      return apiFetch<Todo>(`/api/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousData = queryClient.getQueriesData<TodoInfiniteData>({ queryKey: ["todos"] });

      queryClient.setQueriesData<TodoInfiniteData>({ queryKey: ["todos"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((todo) =>
              todo.id === id ? { ...todo, completed } : todo,
            ),
          })),
        };
      });

      setTodoState(id, {
        state: "syncing",
        wasConfirmed: true,
        pendingOperation: { type: "toggle", args: { id, completed } },
      });
      return { previousData };
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["todos"] });
      clearTodoState(id);
    },
    onError: (error, { id, completed }, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          if (data) queryClient.setQueryData(queryKey, data);
        }
      }
      setTodoState(id, {
        ...classifyError(error),
        wasConfirmed: true,
        pendingOperation: { type: "toggle", args: { id, completed } },
      });
    },
  });
}
