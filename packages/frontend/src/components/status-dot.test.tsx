import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusDot } from "./status-dot.js";

describe("StatusDot", () => {
  it("renders nothing when variant is hidden", () => {
    const { container } = render(<StatusDot variant="hidden" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders syncing dot with role=status and aria-label=Syncing", () => {
    render(<StatusDot variant="syncing" />);
    const dot = screen.getByRole("status");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-label", "Syncing");
  });

  it("renders error dot with role=status and aria-label=Error", () => {
    render(<StatusDot variant="error" />);
    const dot = screen.getByRole("status");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-label", "Error");
  });

  it("syncing dot has 8x8px dimensions", () => {
    render(<StatusDot variant="syncing" />);
    const dot = screen.getByRole("status");
    expect(dot.className).toMatch(/h-2|w-2/);
  });
});
