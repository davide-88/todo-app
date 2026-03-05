import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

export class MockApiFetchError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown, status = 0) {
    super(message);
    this.name = "ApiFetchError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createApiFetchMock() {
  return {
    apiFetch: vi.fn(),
    ApiFetchError: MockApiFetchError,
  };
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

export const makeTodo = (id: string, completed = false) => ({
  id,
  text: `Todo ${id}`,
  completed,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

export const QUERY_KEY = ["todos", { status: undefined, order: "desc" }];
