import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputArea } from "./input-area.js";

const OVER_MAX = "a".repeat(501);

describe("InputArea", () => {
  it("renders an input with placeholder text", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("What needs to be done?"),
    ).toBeInTheDocument();
  });

  it("input has aria-label", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("textbox", { name: /new todo text/i }),
    ).toBeInTheDocument();
  });

  it("renders Add Todo button", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /add todo/i }),
    ).toBeInTheDocument();
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

  it("shows validation error on empty submit", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(screen.getByText("Todo text is required")).toBeInTheDocument();
  });

  it("shows validation error on whitespace-only submit", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(screen.getByText("Todo text is required")).toBeInTheDocument();
  });

  it("shows max length error when input exceeds 500 chars", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: OVER_MAX } });
    expect(screen.getByText("Text exceeds maximum length")).toBeInTheDocument();
  });

  it("prevents submit when input exceeds max length", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: OVER_MAX } });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears error message on keystroke after empty-submit error", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(screen.getByText("Todo text is required")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "a" } });
    expect(screen.queryByText("Todo text is required")).not.toBeInTheDocument();
  });

  it("max length error clears when text is reduced below limit", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: OVER_MAX } });
    expect(screen.getByText("Text exceeds maximum length")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "short text" } });
    expect(
      screen.queryByText("Text exceeds maximum length"),
    ).not.toBeInTheDocument();
  });

  it("input has border-destructive class when validation error shown", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/border-destructive/);
  });

  it("error message is linked to input via aria-describedby", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    const input = screen.getByRole("textbox");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    const errorEl = document.getElementById(errorId!);
    expect(errorEl).toBeTruthy();
    expect(errorEl?.textContent).toBe("Todo text is required");
  });

  it("successful submit clears input and retains focus", () => {
    const onSubmit = vi.fn();
    render(<InputArea onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Valid task" } });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(input).toHaveValue("");
    expect(document.activeElement).toBe(input);
  });
});
