import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { useState } from "react";
import { AppHeader } from "./components/app-header.js";
import { InputArea } from "./components/input-area.js";
import { TodoList } from "./components/todo-list.js";
import { useCreateTodo } from "./hooks/use-create-todo.js";
import { useDeleteTodo } from "./hooks/use-delete-todo.js";
import { useTodoStates } from "./hooks/use-todo-states.js";
import { useTodos } from "./hooks/use-todos.js";
import { useToggleTodo } from "./hooks/use-toggle-todo.js";

export function App() {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { todos, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useTodos({
      order: sortOrder,
    });

  const {
    getTodoState,
    getErrorMessage,
    setTodoState,
    clearTodoState,
    getTodoStateEntry,
  } = useTodoStates();
  const createMutation = useCreateTodo({ setTodoState, clearTodoState });
  const toggleMutation = useToggleTodo({ setTodoState, clearTodoState });
  const deleteMutation = useDeleteTodo({
    setTodoState,
    clearTodoState,
    getTodoStateEntry,
  });

  const handleToggle = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) toggleMutation.mutate({ id, completed: !todo.completed });
  };

  const handleDelete = (id: string) => deleteMutation.handleDelete(id);

  const handleSubmit = (text: string) => {
    createMutation.mutate({ id: crypto.randomUUID(), text });
  };

  const handleRetry = (id: string) => {
    const entry = getTodoStateEntry(id);
    if (!entry?.pendingOperation) return;
    const op = entry.pendingOperation;
    if (op.type === "create") createMutation.mutate(op.args);
    else if (op.type === "toggle") toggleMutation.mutate(op.args);
    else if (op.type === "delete") deleteMutation.handleDelete(op.args.id);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-0">
      <div className="mx-auto max-w-[640px] border border-border rounded-xl overflow-hidden">
        <AppHeader
          sortOrder={sortOrder}
          onToggleSort={() =>
            setSortOrder((o) => (o === "desc" ? "asc" : "desc"))
          }
        />
        <InputArea onSubmit={handleSubmit} />
        <Tabs defaultValue="active">
          <TabsList className="w-full grid grid-cols-2 rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger
              value="active"
              className="rounded-none py-3 border-b-2 data-[state=active]:bg-muted/50 data-[state=active]:shadow-none data-[state=active]:border-foreground data-[state=inactive]:border-border font-medium"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-none py-3 border-b-2 data-[state=active]:bg-muted/50 data-[state=active]:shadow-none data-[state=active]:border-foreground data-[state=inactive]:border-border font-medium"
            >
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <TodoList
          todos={todos}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onRetry={handleRetry}
          getTodoState={getTodoState}
          getErrorMessage={getErrorMessage}
        />
      </div>
    </main>
  );
}
