import type { TodoUiState } from "@todo-app/shared";

export type PendingOperation =
  | { type: "create"; args: { id: string; text: string } }
  | { type: "toggle"; args: { id: string; completed: boolean } }
  | { type: "delete"; args: { id: string } };

export interface TodoStateEntry {
  state: TodoUiState;
  errorMessage?: string;
  pendingOperation?: PendingOperation;
  wasConfirmed: boolean;
}

type SetEntryInput = {
  state: TodoUiState;
  errorMessage?: string;
  wasConfirmed?: boolean;
  pendingOperation?: PendingOperation;
};

export function useTodoStates() {
  const [stateMap, setStateMap] = useState<Map<string, TodoStateEntry>>(new Map());

  const setTodoState = useCallback((id: string, entry: SetEntryInput) => {
    setStateMap((prev) => {
      const newEntry: TodoStateEntry = {
        wasConfirmed: entry.wasConfirmed ?? prev.get(id)?.wasConfirmed ?? false,
        state: entry.state,
        errorMessage: entry.errorMessage,
        pendingOperation: entry.pendingOperation,
      };
      return new Map(prev).set(id, newEntry);
    });
  }, []);

  const clearTodoState = useCallback((id: string) => {
    setStateMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getTodoState = useCallback(
    (id: string): TodoUiState => stateMap.get(id)?.state ?? "confirmed",
    [stateMap],
  );

  const getErrorMessage = useCallback(
    (id: string): string | undefined => stateMap.get(id)?.errorMessage,
    [stateMap],
  );

  const getTodoStateEntry = useCallback(
    (id: string): TodoStateEntry | undefined => stateMap.get(id),
    [stateMap],
  );

  return { getTodoState, getErrorMessage, setTodoState, clearTodoState, getTodoStateEntry };
}
