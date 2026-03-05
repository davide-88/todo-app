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
          // On retry, the optimistic todo is already in the cache — skip insert
          const alreadyExists = old.pages.some((p) => p.data.some((t) => t.id === input.id));
          if (alreadyExists) return old;
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
      const classified = classifyError(error);
      setTodoState(input.id, {
        ...classified,
        pendingOperation: {
          type: "create",
          args: { id: input.id, text: input.text },
        },
      });
    },
  });
}
