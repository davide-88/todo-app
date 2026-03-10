import Value from "typebox/value";
import { describe, it, expect } from "vitest";
import { ApiError } from "./error-schemas.js";

describe("ApiError schema", () => {
  it("accepts valid error with required fields", () => {
    expect(
      Value.Check(ApiError, {
        code: "NOT_FOUND",
        message: "Resource not found",
      }),
    ).toBe(true);
  });

  it("accepts error with optional details", () => {
    expect(
      Value.Check(ApiError, {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: { field: "text", issue: "too long" },
      }),
    ).toBe(true);
  });

  it("rejects missing code", () => {
    expect(Value.Check(ApiError, { message: "Something went wrong" })).toBe(
      false,
    );
  });

  it("rejects missing message", () => {
    expect(Value.Check(ApiError, { code: "INTERNAL_ERROR" })).toBe(false);
  });

  it("rejects non-string code", () => {
    expect(Value.Check(ApiError, { code: 42, message: "error" })).toBe(false);
  });
});
