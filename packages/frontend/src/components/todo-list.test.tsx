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

  it("passes syncing state to TodoRow via getTodoState", () => {
    const todos = [makeTodo("1", "Test todo")];
    const getTodoState = vi.fn().mockReturnValue("syncing");
    render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
        getTodoState={getTodoState}
      />,
    );
    expect(getTodoState).toHaveBeenCalledWith("1");
    const row = screen.getByRole("listitem");
    expect(row).toHaveAttribute("aria-disabled", "true");
  });

  it("defaults to confirmed state when getTodoState not provided", () => {
    const todos = [makeTodo("1", "Test todo")];
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
    const row = screen.getByRole("listitem");
    expect(row).not.toHaveAttribute("aria-disabled");
  });

  it("after delete, focus moves to next row's checkbox", () => {
    const todos = [makeTodo("1", "First"), makeTodo("2", "Second"), makeTodo("3", "Third")];
    const onDelete = vi.fn();
    const { rerender } = render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={onDelete}
        fetchNextPage={vi.fn()}
      />,
    );
    // Click delete on the first todo
    fireEvent.click(screen.getByLabelText("Delete todo: First"));
    expect(onDelete).toHaveBeenCalledWith("1");

    // Simulate optimistic removal
    const remaining = [makeTodo("2", "Second"), makeTodo("3", "Third")];
    rerender(
      <TodoList
        todos={remaining}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={onDelete}
        fetchNextPage={vi.fn()}
      />,
    );
    // Focus should move to the next row's checkbox (Second)
    const nextCheckbox = screen.getByLabelText("Toggle todo: Second");
    expect(nextCheckbox).toHaveFocus();
  });

  it("after deleting last row, focus moves to previous row's checkbox", () => {
    const todos = [makeTodo("1", "First"), makeTodo("2", "Second")];
    const onDelete = vi.fn();
    const { rerender } = render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={onDelete}
        fetchNextPage={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Delete todo: Second"));

    const remaining = [makeTodo("1", "First")];
    rerender(
      <TodoList
        todos={remaining}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={onDelete}
        fetchNextPage={vi.fn()}
      />,
    );
    const prevCheckbox = screen.getByLabelText("Toggle todo: First");
    expect(prevCheckbox).toHaveFocus();
  });

  it("passes errorMessage to TodoRow via getErrorMessage", () => {
    const todos = [makeTodo("1", "Test todo")];
    const getTodoState = vi.fn().mockReturnValue("permanent-error");
    const getErrorMessage = vi.fn().mockReturnValue("Something went wrong");
    render(
      <TodoList
        todos={todos}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        fetchNextPage={vi.fn()}
        getTodoState={getTodoState}
        getErrorMessage={getErrorMessage}
      />,
    );
    expect(getErrorMessage).toHaveBeenCalledWith("1");
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
