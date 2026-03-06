import { describe, it, expect, vi } from "vitest";
import { createApiFetchMock } from "@/test-utils/mock-api.js";

vi.mock("@/lib/api-fetch.js", () => createApiFetchMock());

import { ApiFetchError } from "@/lib/api-fetch.js";
import { classifyError } from "./classify-error.js";

describe("classifyError", () => {
  it("classifies status 400 as permanent-error with message", () => {
    const error = new ApiFetchError("VALIDATION_ERROR", "Bad request", undefined, 400);
    expect(classifyError(error)).toEqual({
      state: "permanent-error",
      errorMessage: "Bad request",
    });
  });

  it("classifies status 404 as permanent-error with message", () => {
    const error = new ApiFetchError("NOT_FOUND", "Todo not found", undefined, 404);
    expect(classifyError(error)).toEqual({
      state: "permanent-error",
      errorMessage: "Todo not found",
    });
  });

  it("classifies status 422 as permanent-error with message", () => {
    const error = new ApiFetchError("UNKNOWN_ERROR", "Unprocessable", undefined, 422);
    expect(classifyError(error)).toEqual({
      state: "permanent-error",
      errorMessage: "Unprocessable",
    });
  });

  it("classifies VALIDATION_ERROR code (any status) as permanent-error", () => {
    const error = new ApiFetchError("VALIDATION_ERROR", "Invalid input", undefined, 0);
    expect(classifyError(error)).toEqual({
      state: "permanent-error",
      errorMessage: "Invalid input",
    });
  });

  it("classifies status 500 as transient-error with message", () => {
    const error = new ApiFetchError("INTERNAL_ERROR", "Server error", undefined, 500);
    expect(classifyError(error)).toEqual({ state: "transient-error", errorMessage: "Server error" });
  });

  it("classifies status 429 as transient-error with message", () => {
    const error = new ApiFetchError("RATE_LIMITED", "Too many requests", undefined, 429);
    expect(classifyError(error)).toEqual({ state: "transient-error", errorMessage: "Too many requests" });
  });

  it("classifies NETWORK_ERROR code as transient-error with message", () => {
    const error = new ApiFetchError("NETWORK_ERROR", "Network request failed", undefined, 0);
    expect(classifyError(error)).toEqual({ state: "transient-error", errorMessage: "Network request failed" });
  });

  it("defaults unknown Error to transient-error with message", () => {
    expect(classifyError(new Error("Something went wrong"))).toEqual({
      state: "transient-error",
      errorMessage: "Something went wrong",
    });
  });

  it("defaults non-error value to transient-error without message", () => {
    expect(classifyError("some string error")).toEqual({ state: "transient-error" });
  });

  it("classifies TIMEOUT error as transient-error", () => {
    const error = new ApiFetchError("TIMEOUT", "Request timed out", undefined, 0);
    expect(classifyError(error)).toEqual({ state: "transient-error" });
  });
});
