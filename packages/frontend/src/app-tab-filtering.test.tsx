import { App } from "@/app.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-fetch.js", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-fetch.js")>("@/lib/api-fetch.js");
  return { ...actual, apiFetch: vi.fn() };
});

import { apiFetch } from "@/lib/api-fetch.js";
const mockApiFetch = vi.mocked(apiFetch);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderApp() {
  const queryClient = makeQueryClient();
  return render(<App />, {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiFetch.mockResolvedValue({ data: [], cursor: null });
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("tab state initialization from URL", () => {
  it("Active tab is selected by default when no URL param", async () => {
    renderApp();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=active"),
        undefined,
      );
    });
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "Completed" })).toHaveAttribute(
      "data-state",
      "inactive",
    );
  });

  it("Completed tab is selected when URL has ?todo-status=completed", async () => {
    window.history.replaceState({}, "", "?todo-status=completed");

    renderApp();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=completed"),
        undefined,
      );
    });
    expect(screen.getByRole("tab", { name: "Completed" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute("data-state", "inactive");
  });

  it("Active tab is selected when URL has invalid todo-status value", async () => {
    window.history.replaceState({}, "", "?todo-status=invalid");

    renderApp();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=active"),
        undefined,
      );
    });
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute("data-state", "active");
  });
});

describe("tab switching behavior", () => {
  it("clicking Completed tab refetches with status=completed", async () => {
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    mockApiFetch.mockClear();

    // Radix UI TabsTrigger uses onMouseDown (not onClick) to trigger onValueChange
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Completed" }), { button: 0 });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=completed"),
        undefined,
      );
    });
  });

  it("clicking Active tab refetches with status=active", async () => {
    window.history.replaceState({}, "", "?todo-status=completed");
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    mockApiFetch.mockClear();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Active" }), { button: 0 });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=active"),
        undefined,
      );
    });
  });

  it("clicking Completed tab calls history.replaceState with ?todo-status=completed", async () => {
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const replaceStateSpy = vi.spyOn(history, "replaceState");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Completed" }), { button: 0 });

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "?todo-status=completed");
  });

  it("clicking Active tab calls history.replaceState with ?todo-status=active", async () => {
    window.history.replaceState({}, "", "?todo-status=completed");
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const replaceStateSpy = vi.spyOn(history, "replaceState");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Active" }), { button: 0 });

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "?todo-status=active");
  });
});
