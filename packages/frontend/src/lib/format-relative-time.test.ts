import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "./format-relative-time.js";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for < 60 seconds ago", () => {
    const date = new Date("2024-01-01T11:59:30Z").toISOString();
    expect(formatRelativeTime(date)).toBe("just now");
  });

  it("returns '5m ago' for 5 minutes ago", () => {
    const date = new Date("2024-01-01T11:55:00Z").toISOString();
    expect(formatRelativeTime(date)).toBe("5m ago");
  });

  it("returns '2h ago' for 2 hours ago", () => {
    const date = new Date("2024-01-01T10:00:00Z").toISOString();
    expect(formatRelativeTime(date)).toBe("2h ago");
  });

  it("returns '3d ago' for 3 days ago", () => {
    const date = new Date("2023-12-29T12:00:00Z").toISOString();
    expect(formatRelativeTime(date)).toBe("3d ago");
  });
});
