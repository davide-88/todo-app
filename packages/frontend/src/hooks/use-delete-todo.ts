import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch.js";
import { classifyError } from "@/lib/classify-error.js";
import type { TodoInfiniteData, TodoMutationCallbacks } from "@/lib/classify-error.js";

type DeleteTodoCallbacks = TodoMutationCallbacks & {
  getTodoStateEntry: (id: string) => { wasConfirmed: boolean } | undefined;
};

export function useDeleteTodo({ setTodoState, clearTodoState, getTodoStateEntry }: DeleteTodoCallbacks) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await apiFetch(`/api/todos/${id}`, { method: "DELETE" });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousData = queryClient.getQueriesData<TodoInfiniteData>({ queryKey: ["todos"] });

      queryClient.setQueriesData<TodoInfiniteData>({ queryKey: ["todos"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((todo) => todo.id !== id),
          })),
        };
      });

      setTodoState(id, {
        state: "syncing",
        wasConfirmed: true,
        pendingOperation: { type: "delete", args: { id } },
      });
      return { previousData };
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["todos"] });
      clearTodoState(id);
    },
    onError: (error, { id }, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          if (data) queryClient.setQueryData(queryKey, data);
        }
      }
      setTodoState(id, {
        ...classifyError(error),
        wasConfirmed: true,
        pendingOperation: { type: "delete", args: { id } },
      });
    },
  });

  const handleDelete = (id: string) => {
    const entry = getTodoStateEntry(id);
    if (!entry?.wasConfirmed) {
      queryClient.setQueriesData<TodoInfiniteData>({ queryKey: ["todos"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((todo) => todo.id !== id),
          })),
        };
      });
      clearTodoState(id);
      return;
    }
    mutation.mutate({ id });
  };

  return { ...mutation, handleDelete };
}
