import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputArea } from "./input-area.js";

describe("InputArea", () => {
  it("renders an input with placeholder text", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText("What needs to be done?")).toBeInTheDocument();
  });

  it("input has aria-label", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /new todo text/i })).toBeInTheDocument();
  });

  it("renders Add Todo button", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /add todo/i })).toBeInTheDocument();
  });

  it("calls onSubmit with input value when button clicked", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(onSubmit).toHaveBeenCalledWith("New task");
  });

  it("calls onSubmit when Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Enter task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("Enter task");
  });

  it("clears input after successful submit", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(input).toHaveValue("");
  });

  it("does not call onSubmit with empty input", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit with whitespace-only input", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
