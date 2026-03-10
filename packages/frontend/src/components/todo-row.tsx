import { X, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox.js";
import { Button } from "@/components/ui/button.js";
import { StatusDot } from "./status-dot.js";
import { ErrorMessage } from "./error-message.js";
import { formatRelativeTime } from "@/lib/format-relative-time.js";
import type { Todo, TodoUiState } from "@todo-app/shared";

interface TodoRowProps {
  todo: Todo;
  state: TodoUiState;
  errorMessage?: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
  checkboxRef?: (el: HTMLButtonElement | null) => void;
}

export const TodoRow = ({
  todo,
  state,
  errorMessage,
  onToggle,
  onDelete,
  onRetry,
  checkboxRef,
}: TodoRowProps) => {
  const isSyncing = state === "syncing";
  const isError = state === "transient-error" || state === "permanent-error";
  const isCompleted = todo.completed;
  const errorId =
    state === "permanent-error" && errorMessage
      ? `error-${todo.id}`
      : undefined;

  return (
    <div
      role="listitem"
      aria-disabled={isSyncing ? "true" : undefined}
      aria-describedby={errorId}
      className={[
        "group",
        isSyncing ? "pointer-events-none opacity-50" : "",
        isError ? "bg-[hsl(var(--destructive-bg))]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-3 px-4 py-3 min-h-[48px]">
        {isSyncing && <StatusDot variant="syncing" />}
        {isError && <StatusDot variant="error" />}
        {!isSyncing && !isError && <StatusDot variant="hidden" />}

        <Checkbox
          ref={checkboxRef}
          checked={isCompleted}
          disabled={isSyncing || isError}
          onCheckedChange={() => onToggle(todo.id)}
          aria-label={`Toggle todo: ${todo.text}`}
          tabIndex={isSyncing ? -1 : undefined}
        />

        <span
          className={[
            "flex-1 text-sm",
            isCompleted ? "line-through text-muted-foreground" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {todo.text}
        </span>

        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(todo.createdAt)}
        </span>

        {state === "transient-error" && onRetry && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Retry todo: ${todo.text}`}
            onClick={() => onRetry(todo.id)}
            tabIndex={isSyncing ? -1 : undefined}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete todo: ${todo.text}`}
          onClick={() => onDelete(todo.id)}
          className={
            isError
              ? ""
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
          }
          tabIndex={isSyncing ? -1 : undefined}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ErrorMessage id={errorId} state={state} message={errorMessage} />
    </div>
  );
};
