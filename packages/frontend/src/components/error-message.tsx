import type { TodoUiState } from "@todo-app/shared";

interface ErrorMessageProps {
  id?: string;
  state: TodoUiState;
  message?: string;
}

export const ErrorMessage = ({ id, state, message }: ErrorMessageProps) => {
  if (state !== "permanent-error" || !message) return null;

  return (
    <p
      id={id}
      role="alert"
      className="text-[13px] text-destructive pt-1 px-4 pb-2"
    >
      {message}
    </p>
  );
};
