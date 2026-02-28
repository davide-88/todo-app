export type TodoUiState =
  | "confirmed"
  | "syncing"
  | "transient-error"
  | "permanent-error";

export type TodoUiEvent =
  | "MUTATE"
  | "SUCCESS"
  | "TRANSIENT_ERROR"
  | "PERMANENT_ERROR"
  | "RETRY";

const transitions: Partial<Record<TodoUiState, Partial<Record<TodoUiEvent, TodoUiState>>>> = {
  confirmed: {
    MUTATE: "syncing",
  },
  syncing: {
    SUCCESS: "confirmed",
    TRANSIENT_ERROR: "transient-error",
    PERMANENT_ERROR: "permanent-error",
  },
  "transient-error": {
    RETRY: "syncing",
    MUTATE: "syncing",
  },
};

export function transitionTodoState(
  currentState: TodoUiState,
  event: TodoUiEvent,
): TodoUiState {
  const nextState = transitions[currentState]?.[event];
  if (nextState === undefined) {
    throw new Error(
      `Invalid transition: ${currentState} + ${event}`,
    );
  }
  return nextState;
}
