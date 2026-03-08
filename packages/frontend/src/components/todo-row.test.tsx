import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodoRow } from "./todo-row.js";
import type { Todo } from "@todo-app/shared";

const baseTodo: Todo = {
  id: "1",
  text: "Buy groceries",
  completed: false,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
};

const completedTodo: Todo = { ...baseTodo, completed: true };

describe("TodoRow", () => {
  it("renders confirmed-active: unchecked checkbox and normal text", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="confirmed"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const listitem = screen.getByRole("listitem");
    expect(listitem).toBeInTheDocument();
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("renders confirmed-completed: checked checkbox and strikethrough text", () => {
    render(
      <TodoRow
        todo={completedTodo}
        state="confirmed"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    const text = screen.getByText("Buy groceries");
    expect(text.className).toMatch(/line-through/);
  });

  it("syncing state: aria-disabled=true on listitem", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="syncing"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const listitem = screen.getByRole("listitem");
    expect(listitem).toHaveAttribute("aria-disabled", "true");
  });

  it("transient-error state: shows retry button", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="transient-error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Retry todo: Buy groceries")).toBeInTheDocument();
  });

  it("permanent-error state: shows delete button but no retry", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="permanent-error"
        errorMessage="Server error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Delete todo: Buy groceries")).toBeInTheDocument();
    expect(screen.queryByLabelText("Retry todo: Buy groceries")).toBeNull();
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <TodoRow
        todo={baseTodo}
        state="permanent-error"
        onToggle={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByLabelText("Delete todo: Buy groceries"));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("calls onToggle when checkbox is clicked (confirmed state)", () => {
    const onToggle = vi.fn();
    render(
      <TodoRow
        todo={baseTodo}
        state="confirmed"
        onToggle={onToggle}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("1");
  });

  it("calls onRetry when retry button clicked", () => {
    const onRetry = vi.fn();
    render(
      <TodoRow
        todo={baseTodo}
        state="transient-error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByLabelText("Retry todo: Buy groceries"));
    expect(onRetry).toHaveBeenCalledWith("1");
  });

  it("permanent-error: links error message via aria-describedby", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="permanent-error"
        errorMessage="Server error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const listitem = screen.getByRole("listitem");
    const describedBy = listitem.getAttribute("aria-describedby");
    expect(describedBy).toBe("error-1");
    const errorEl = document.getElementById("error-1");
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toBe("Server error");
  });

  it("transient-error without onRetry: no retry button shown", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="transient-error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Retry todo: Buy groceries")).toBeNull();
    expect(screen.getByLabelText("Delete todo: Buy groceries")).toBeInTheDocument();
  });

  it("error row: delete button always visible (no hover-only class)", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="transient-error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByLabelText("Delete todo: Buy groceries");
    expect(deleteBtn.className).not.toMatch(/md:opacity-0/);
  });

  it("normal row: delete button has hover-reveal class on desktop", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="confirmed"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByLabelText("Delete todo: Buy groceries");
    expect(deleteBtn.className).toMatch(/md:opacity-0/);
  });

  it("permanent-error without errorMessage: no ErrorMessage rendered, no aria-describedby", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="permanent-error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const listitem = screen.getByRole("listitem");
    expect(listitem).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("permanent-error with onRetry prop: retry button still NOT rendered", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="permanent-error"
        errorMessage="Server error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Retry todo: Buy groceries")).toBeNull();
    expect(screen.getByLabelText("Delete todo: Buy groceries")).toBeInTheDocument();
  });

  it("syncing state: checkbox and buttons have tabIndex=-1", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="syncing"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { hidden: true });
    expect(checkbox).toHaveAttribute("tabindex", "-1");
    const deleteBtn = screen.getByLabelText("Delete todo: Buy groceries");
    expect(deleteBtn).toHaveAttribute("tabindex", "-1");
  });

  it("confirmed state: checkbox and buttons do not have tabIndex=-1", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="confirmed"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toHaveAttribute("tabindex", "-1");
    const deleteBtn = screen.getByLabelText("Delete todo: Buy groceries");
    expect(deleteBtn).not.toHaveAttribute("tabindex", "-1");
  });

  it("icon buttons have touch-target-friendly size (>= 44px)", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="confirmed"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByLabelText("Delete todo: Buy groceries");
    // h-11 w-11 = 44x44px for WCAG touch target compliance
    expect(deleteBtn.className).toMatch(/h-11/);
    expect(deleteBtn.className).toMatch(/w-11/);
  });

  it("error message renders below the row content, not inline", () => {
    render(
      <TodoRow
        todo={baseTodo}
        state="permanent-error"
        errorMessage="Server error"
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const listitem = screen.getByRole("listitem");
    const alert = screen.getByRole("alert");
    // Alert is a direct child of the listitem, not nested inside the flex row
    expect(alert.parentElement).toBe(listitem);
    // The flex row (first child) precedes the alert (second child)
    const flexRow = listitem.firstElementChild!;
    expect(flexRow).not.toBe(alert);
    expect(flexRow.className).toMatch(/flex/);
  });
});
