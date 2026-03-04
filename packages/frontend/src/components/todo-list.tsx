import { Button } from "@/components/ui/button.js";
import { PlaceholderRow } from "./placeholder-row.js";
import { TodoRow } from "./todo-row.js";
import type { Todo } from "@todo-app/shared";
import type { FetchNextPageOptions, InfiniteQueryObserverResult } from "@tanstack/react-query";

const PLACEHOLDER_WIDTHS = [60, 45, 70, 55, 40];

interface TodoListProps {
  todos: Todo[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult>;
}

export const TodoList = ({
  todos,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onToggle,
  onDelete,
  onRetry,
  fetchNextPage,
}: TodoListProps) => {
  const showPlaceholders = isLoading || todos.length === 0;

  return (
    <div>
      <div role="list" aria-live="polite" className="divide-y divide-border">
        {showPlaceholders
          ? PLACEHOLDER_WIDTHS.map((w, i) => <PlaceholderRow key={i} widthPercent={w} />)
          : todos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                state="confirmed"
                onToggle={onToggle}
                onDelete={onDelete}
                onRetry={onRetry}
              />
            ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center p-4">
          <Button
            variant="ghost"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
};
