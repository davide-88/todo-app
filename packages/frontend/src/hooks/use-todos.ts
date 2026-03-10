import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch.js";
import type { TodoListResponse } from "@todo-app/shared";

interface UseTodosOptions {
  status?: "active" | "completed";
  order?: "asc" | "desc";
}

export function useTodos(options: UseTodosOptions = {}) {
  const { status, order = "desc" } = options;
  const query = useInfiniteQuery({
    queryKey: ["todos", { status, order }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (order) params.set("order", order);
      if (pageParam) params.set("cursor", pageParam);
      const qs = params.toString();
      return apiFetch<TodoListResponse>(
        `/api/todos${qs ? `?${qs}` : ""}`,
        undefined,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });

  return {
    todos: query.data?.pages.flatMap((p) => p.data) ?? [],
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
