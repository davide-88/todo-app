import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.js";
import { PlaceholderRow } from "./placeholder-row.js";
import { TodoRow } from "./todo-row.js";
import type { Todo, TodoUiState } from "@todo-app/shared";
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
  getTodoState?: (id: string) => TodoUiState;
  getErrorMessage?: (id: string) => string | undefined;
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
  getTodoState,
  getErrorMessage,
}: TodoListProps) => {
  const showPlaceholders = isLoading || todos.length === 0;
  const checkboxRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusTarget = useRef<string | null>(null);

  const setCheckboxRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      checkboxRefs.current.set(id, el);
    } else {
      checkboxRefs.current.delete(id);
    }

    // If this is the element we're waiting to focus, focus it now
    if (el && pendingFocusTarget.current === id) {
      el.focus();
      pendingFocusTarget.current = null;
    }
  }, []);

  const handleDeleteWithFocus = useCallback((id: string) => {
    const idx = todos.findIndex((t) => t.id === id);
    const nextId = todos[idx + 1]?.id ?? todos[idx - 1]?.id;
    if (nextId) {
      pendingFocusTarget.current = nextId;
    }
    onDelete(id);
  }, [todos, onDelete]);

  return (
    <div>
      <div role="list" aria-live="polite" className="divide-y divide-border">
        {showPlaceholders
          ? PLACEHOLDER_WIDTHS.map((w, i) => <PlaceholderRow key={i} widthPercent={w} />)
          : todos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                state={getTodoState?.(todo.id) ?? "confirmed"}
                errorMessage={getErrorMessage?.(todo.id)}
                onToggle={onToggle}
                onDelete={handleDeleteWithFocus}
                onRetry={onRetry}
                checkboxRef={(el) => setCheckboxRef(todo.id, el)}
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
