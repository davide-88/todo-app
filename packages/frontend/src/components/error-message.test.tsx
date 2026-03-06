import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorMessage } from "./error-message.js";

describe("ErrorMessage", () => {
  it("renders nothing when state is not permanent-error", () => {
    const { container } = render(<ErrorMessage state="confirmed" message="oops" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders alert with message when state is permanent-error", () => {
    render(<ErrorMessage state="permanent-error" message="Server error" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Server error");
  });

  it("renders nothing when message is empty even in permanent-error", () => {
    const { container } = render(<ErrorMessage state="permanent-error" message="" />);
    expect(container.firstChild).toBeNull();
  });

  it("applies text-[13px] and text-destructive classes", () => {
    render(<ErrorMessage state="permanent-error" message="Some error" />);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("text-[13px]");
    expect(alert.className).toContain("text-destructive");
  });
});
