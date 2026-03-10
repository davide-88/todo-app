import type { ApiError } from "@todo-app/shared";

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const parsedTimeout = parseInt(
  (import.meta.env.VITE_API_TIMEOUT as string | undefined) ?? "10000",
  10,
);
const DEFAULT_TIMEOUT_MS = Number.isNaN(parsedTimeout) ? 10000 : parsedTimeout;

type ErrorBody = { code?: string; message?: string; details?: unknown };
type ApiFetchOptions = RequestInit & { timeout?: number };

export class ApiFetchError extends Error implements ApiError {
  code: string;
  details?: unknown;
  status: number;

  constructor(
    code: string,
    message: string,
    details?: unknown,
    status: number = 0,
  ) {
    super(message);
    this.name = "ApiFetchError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;

  let signal: AbortSignal = AbortSignal.timeout(timeoutMs);
  if (options?.signal) {
    signal = AbortSignal.any([signal, options.signal]);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal,
      headers: {
        ...(options?.body !== undefined && {
          "Content-Type": "application/json",
        }),
        ...options?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "TimeoutError") {
        throw new ApiFetchError("TIMEOUT", "Request timed out", undefined, 0);
      }
      if (error.name === "AbortError") {
        throw new ApiFetchError(
          "ABORTED",
          "Request was cancelled",
          undefined,
          0,
        );
      }
    }
    throw new ApiFetchError("NETWORK_ERROR", "Network request failed");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiFetchError(
      body.code ?? "UNKNOWN_ERROR",
      body.message ?? response.statusText,
      body.details,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
