import { describe, it, expect } from "vitest";
import { computeNextStreakState } from "./seal-probation";

const NOW = new Date("2026-01-15T00:00:00Z");

describe("computeNextStreakState", () => {
  it("extends the streak by one day when net score is non-negative and below the conversion threshold", () => {
    const result = computeNextStreakState(0, 5, NOW);
    expect(result).toEqual({
      positiveStreakDays: 1,
      status: "PROVISIONAL",
      permanentAt: null,
      lastStreakResetAt: null,
    });
  });

  it("extends on a net score of exactly zero (non-negative, not just positive)", () => {
    const result = computeNextStreakState(10, 0, NOW);
    expect(result.status).toBe("PROVISIONAL");
    expect(result.positiveStreakDays).toBe(11);
  });

  it("converts to PERMANENT the moment the streak reaches exactly 30 days", () => {
    const result = computeNextStreakState(29, 3, NOW);
    expect(result).toEqual({
      positiveStreakDays: 30,
      status: "PERMANENT",
      permanentAt: NOW,
      lastStreakResetAt: null,
    });
  });

  it("stays PROVISIONAL the day before conversion (29 days)", () => {
    const result = computeNextStreakState(28, 1, NOW);
    expect(result.status).toBe("PROVISIONAL");
    expect(result.positiveStreakDays).toBe(29);
    expect(result.permanentAt).toBeNull();
  });

  it("once converted, stays PERMANENT going further past 30 (streak keeps incrementing)", () => {
    const result = computeNextStreakState(45, 2, NOW);
    expect(result.status).toBe("PERMANENT");
    expect(result.positiveStreakDays).toBe(46);
  });

  it("resets the streak to zero on any negative net score, regardless of prior streak length", () => {
    const result = computeNextStreakState(25, -1, NOW);
    expect(result).toEqual({
      positiveStreakDays: 0,
      status: "PROVISIONAL",
      permanentAt: null,
      lastStreakResetAt: NOW,
    });
  });

  it("a dip on day zero still resets cleanly (no negative streak values)", () => {
    const result = computeNextStreakState(0, -5, NOW);
    expect(result.positiveStreakDays).toBe(0);
    expect(result.lastStreakResetAt).toEqual(NOW);
  });
});
