import type { ApiError } from "@todo-app/shared";

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type ErrorBody = { code?: string; message?: string; details?: unknown };

export class ApiFetchError extends Error implements ApiError {
  code: string;
  details?: unknown;
  status: number;

  constructor(code: string, message: string, details?: unknown, status: number = 0) {
    super(message);
    this.name = "ApiFetchError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options?.body !== undefined && { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiFetchError("NETWORK_ERROR", "Network request failed");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ErrorBody;
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
