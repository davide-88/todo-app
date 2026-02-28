import { describe, it, expect } from "vitest";
import {
  maxTextLength,
  pageSize,
  errorCodes,
} from "./constants.js";

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
    it("has VALIDATION_ERROR", () => {
      expect(errorCodes.VALIDATION_ERROR).toBeDefined();
      expect(typeof errorCodes.VALIDATION_ERROR).toBe("string");
    });

    it("has NOT_FOUND", () => {
      expect(errorCodes.NOT_FOUND).toBeDefined();
      expect(typeof errorCodes.NOT_FOUND).toBe("string");
    });

    it("has RATE_LIMITED", () => {
      expect(errorCodes.RATE_LIMITED).toBeDefined();
      expect(typeof errorCodes.RATE_LIMITED).toBe("string");
    });

    it("has INTERNAL_ERROR", () => {
      expect(errorCodes.INTERNAL_ERROR).toBeDefined();
      expect(typeof errorCodes.INTERNAL_ERROR).toBe("string");
    });

    it("has exactly 4 keys", () => {
      expect(Object.keys(errorCodes)).toHaveLength(4);
    });
  });
});
