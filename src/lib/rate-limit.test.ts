import { describe, it, expect } from "vitest";
import { overLimit, hourAgo } from "./rate-limit";

describe("overLimit", () => {
  it("allows when count is below the limit", () => {
    expect(overLimit(3, 10, "new reviews")).toEqual({ allowed: true });
  });

  it("blocks when count equals the limit", () => {
    const result = overLimit(10, 10, "new reviews");
    expect(result.allowed).toBe(false);
  });

  it("blocks when count exceeds the limit", () => {
    const result = overLimit(15, 10, "votes");
    expect(result.allowed).toBe(false);
  });

  it("includes the limit and the activity label in the block reason", () => {
    const result = overLimit(10, 10, "comments");
    if (result.allowed) throw new Error("expected blocked");
    expect(result.reason).toContain("10");
    expect(result.reason).toContain("comments");
  });
});

describe("hourAgo", () => {
  it("returns exactly one hour before the given instant", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    expect(hourAgo(now)).toEqual(new Date("2026-01-15T11:00:00Z"));
  });

  it("defaults to the current time when no instant is given", () => {
    const before = Date.now();
    const result = hourAgo();
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before - 60 * 60 * 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after - 60 * 60 * 1000);
  });
});
