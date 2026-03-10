import { describe, it, expect } from "vitest";
import { maxTextLength, pageSize, errorCodes } from "./constants.js";

describe("constants", () => {
  describe("maxTextLength", () => {
    it("is 500", () => {
      expect(maxTextLength).toBe(500);
    });

    it("is a number", () => {
      expect(typeof maxTextLength).toBe("number");
    });
  });

  describe("pageSize", () => {
    it("is 20", () => {
      expect(pageSize).toBe(20);
    });

    it("is a number", () => {
      expect(typeof pageSize).toBe("number");
    });
  });

  describe("errorCodes", () => {
    it("VALIDATION_ERROR equals 'VALIDATION_ERROR'", () => {
      expect(errorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    });

    it("NOT_FOUND equals 'NOT_FOUND'", () => {
      expect(errorCodes.NOT_FOUND).toBe("NOT_FOUND");
    });

    it("RATE_LIMITED equals 'RATE_LIMITED'", () => {
      expect(errorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
    });

    it("INTERNAL_ERROR equals 'INTERNAL_ERROR'", () => {
      expect(errorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    });

    it("has exactly 4 keys", () => {
      expect(Object.keys(errorCodes)).toHaveLength(4);
    });
  });
});
