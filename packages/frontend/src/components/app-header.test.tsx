import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppHeader } from "./app-header.js";

describe("AppHeader", () => {
  it("renders 'todos' title", () => {
    render(<AppHeader sortOrder="desc" onToggleSort={vi.fn()} />);
    expect(screen.getByText("todos")).toBeInTheDocument();
  });

  it("shows 'Newest first' when sortOrder=desc", () => {
    render(<AppHeader sortOrder="desc" onToggleSort={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /newest first/i });
    expect(btn).toBeInTheDocument();
  });

  it("shows 'Oldest first' when sortOrder=asc", () => {
    render(<AppHeader sortOrder="asc" onToggleSort={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /oldest first/i });
    expect(btn).toBeInTheDocument();
  });

  it("calls onToggleSort when sort button is clicked", () => {
    const onToggleSort = vi.fn();
    render(<AppHeader sortOrder="desc" onToggleSort={onToggleSort} />);
    fireEvent.click(screen.getByRole("button", { name: /newest first/i }));
    expect(onToggleSort).toHaveBeenCalledTimes(1);
  });

  it("button has dynamic aria-label", () => {
    render(<AppHeader sortOrder="desc" onToggleSort={vi.fn()} />);
    const btn = screen.getByRole("button", {
      name: /sort order: newest first/i,
    });
    expect(btn).toBeInTheDocument();
  });
});
