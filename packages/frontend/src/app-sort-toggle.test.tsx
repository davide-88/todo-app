import { App } from "@/app.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-fetch.js", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-fetch.js")>(
      "@/lib/api-fetch.js",
    );
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

describe("sort toggle — App-level integration", () => {
  it("default sort is newest first (order=desc)", async () => {
    renderApp();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        undefined,
      );
    });
    expect(
      screen.getByRole("button", { name: /sort order: newest first/i }),
    ).toBeInTheDocument();
  });

  it("clicking sort toggle refetches with order=asc", async () => {
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    mockApiFetch.mockClear();

    fireEvent.click(
      screen.getByRole("button", { name: /sort order: newest first/i }),
    );

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=asc"),
        undefined,
      );
    });
    expect(
      screen.getByRole("button", { name: /sort order: oldest first/i }),
    ).toBeInTheDocument();
  });

  it("clicking sort toggle twice refetches with order=desc again and shows Newest first", async () => {
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());

    fireEvent.click(
      screen.getByRole("button", { name: /sort order: newest first/i }),
    );
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=asc"),
        undefined,
      ),
    );
    mockApiFetch.mockClear();

    fireEvent.click(
      screen.getByRole("button", { name: /sort order: oldest first/i }),
    );

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        undefined,
      );
    });
    expect(
      screen.getByRole("button", { name: /sort order: newest first/i }),
    ).toBeInTheDocument();
  });
});

describe("sort preserved across tab switches", () => {
  it("sort order=asc is preserved when switching to Completed tab", async () => {
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());

    // Set sort to ascending
    fireEvent.click(
      screen.getByRole("button", { name: /sort order: newest first/i }),
    );
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=asc"),
        undefined,
      ),
    );
    mockApiFetch.mockClear();

    // Switch to Completed tab
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Completed" }), {
      button: 0,
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=asc"),
        undefined,
      );
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("status=completed"),
      undefined,
    );
  });

  it("sort order=desc is preserved when switching from Completed back to Active", async () => {
    window.history.replaceState({}, "", "?todo-status=completed");
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    mockApiFetch.mockClear();

    // Switch to Active tab — sort should still be desc (default)
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Active" }), {
      button: 0,
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        undefined,
      );
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("status=active"),
      undefined,
    );
  });
});

describe("sort is session-only (not URL-persisted)", () => {
  it("fresh App render always starts with order=desc (sort is never URL-persisted)", async () => {
    renderApp();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        undefined,
      );
    });
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("order=asc"),
      undefined,
    );
  });

  it("clicking sort toggle does NOT update URL with order param", async () => {
    renderApp();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const replaceStateSpy = vi.spyOn(history, "replaceState");

    fireEvent.click(
      screen.getByRole("button", { name: /sort order: newest first/i }),
    );

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=asc"),
        undefined,
      ),
    );
    // replaceState should NOT have been called with any order param
    const calls = replaceStateSpy.mock.calls;
    for (const [, , url] of calls) {
      expect(String(url ?? "")).not.toContain("order=");
    }
  });
});
