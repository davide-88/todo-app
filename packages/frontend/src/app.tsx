import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { AppHeader } from "./components/app-header.js";
import { InputArea } from "./components/input-area.js";
import { TodoList } from "./components/todo-list.js";
import { useTodos } from "./hooks/use-todos.js";

export function App() {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { todos, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useTodos({
    order: sortOrder,
  });

  // Story 1.5: toggle/delete mutations (no-ops until implemented)
  const handleToggle: (id: string) => void = () => undefined;
  const handleDelete: (id: string) => void = () => undefined;
  // Story 1.4: create mutation (no-op until implemented)
  const handleSubmit: (text: string) => void = () => undefined;

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-0">
      <div className="mx-auto max-w-[640px] border border-border rounded-xl overflow-hidden">
        <AppHeader
          sortOrder={sortOrder}
          onToggleSort={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
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
        />
      </div>
    </main>
  );
}
