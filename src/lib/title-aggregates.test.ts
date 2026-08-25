import { describe, it, expect } from "vitest";
import { computeCommunityScore } from "./title-aggregates";

describe("computeCommunityScore", () => {
  it("returns null when there are no category scores at all", () => {
    expect(computeCommunityScore({})).toBeNull();
  });

  it("returns null when every category score is null (no reviews yet)", () => {
    expect(computeCommunityScore({ art: null, plot: null })).toBeNull();
  });

  it("returns the single value for one category", () => {
    expect(computeCommunityScore({ art: 8 })).toBe(8);
  });

  it("averages multiple category scores", () => {
    expect(computeCommunityScore({ art: 8, plot: 6, pacing: 7 })).toBe(7);
  });

  it("ignores null entries when averaging (a category with no scores yet)", () => {
    expect(computeCommunityScore({ art: 8, plot: null, pacing: 6 })).toBe(7);
  });

  it("rounds to two decimal places", () => {
    expect(computeCommunityScore({ a: 8, b: 7, c: 9 })).toBeCloseTo(8, 2);
    expect(computeCommunityScore({ a: 7, b: 8, c: 8 })).toBeCloseTo(7.67, 2);
  });
});
