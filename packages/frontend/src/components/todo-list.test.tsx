import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodoList } from "./todo-list.js";
import type { Todo } from "@todo-app/shared";

const makeTodo = (id: string, text: string, completed = false): Todo => ({
  id,
  text,
  completed,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
});

describe("TodoList", () => {
  it("renders placeholder rows when isLoading=true", () => {
    render(
      <TodoList
        todos={[]}
        isLoading={true}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
      />,
    );
    const listitems = screen.getAllByRole("listitem");
    expect(listitems.length).toBeGreaterThan(0);
  });

  it("renders placeholder rows when todos are empty after loading", () => {
    render(
      <TodoList
        todos={[]}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
      />,
    );
    const listitems = screen.getAllByRole("listitem");
    expect(listitems.length).toBeGreaterThan(0);
  });

  it("renders todo rows when todos exist", () => {
    const todos = [makeTodo("1", "Test todo"), makeTodo("2", "Another todo")];
    render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
      />,
    );
    expect(screen.getByText("Test todo")).toBeInTheDocument();
    expect(screen.getByText("Another todo")).toBeInTheDocument();
  });

  it("shows 'Load more' button when hasNextPage=true", () => {
    const todos = [makeTodo("1", "Test todo")];
    render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("disables 'Load more' when isFetchingNextPage=true", () => {
    const todos = [makeTodo("1", "Test todo")];
    render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={true}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /load more/i })).toBeDisabled();
  });

  it("list container has role=list and aria-live=polite", () => {
    render(
      <TodoList
        todos={[]}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
      />,
    );
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-live", "polite");
  });

  it("calls fetchNextPage when 'Load more' is clicked", () => {
    const fetchNextPage = vi.fn().mockResolvedValue({});
    const todos = [makeTodo("1", "Test todo")];
    render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={fetchNextPage}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
