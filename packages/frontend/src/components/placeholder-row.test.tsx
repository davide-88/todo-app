import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceholderRow } from "./placeholder-row.js";

describe("PlaceholderRow", () => {
  it("renders a listitem", () => {
    render(<PlaceholderRow />);
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("renders checkbox placeholder and text placeholder", () => {
    render(<PlaceholderRow />);
    const listitem = screen.getByRole("listitem");
    const divs = listitem.querySelectorAll("div");
    expect(divs.length).toBeGreaterThanOrEqual(2);
  });

  it("applies widthPercent to text placeholder", () => {
    render(<PlaceholderRow widthPercent={50} />);
    const listitem = screen.getByRole("listitem");
    const textPlaceholder = listitem.querySelectorAll("div")[1];
    expect(textPlaceholder?.style.width).toBe("50%");
  });

  it("defaults to widthPercent=60", () => {
    render(<PlaceholderRow />);
    const listitem = screen.getByRole("listitem");
    const textPlaceholder = listitem.querySelectorAll("div")[1];
    expect(textPlaceholder?.style.width).toBe("60%");
  });
});
