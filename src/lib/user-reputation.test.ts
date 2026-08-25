import { describe, it, expect } from "vitest";
import { computeReputationScore } from "./user-reputation";

describe("computeReputationScore", () => {
  it("returns zero for a user with no activity at all", () => {
    const score = computeReputationScore({
      reviewCount: 0,
      certifiedBangerCount: 0,
      netVotesReceived: 0,
      votesCastByDay: [],
    });
    expect(score).toBe(0);
  });

  it("awards 2 points per published review", () => {
    const score = computeReputationScore({
      reviewCount: 3,
      certifiedBangerCount: 0,
      netVotesReceived: 0,
      votesCastByDay: [],
    });
    expect(score).toBe(6);
  });

  it("awards 25 points per Certified Banger seal", () => {
    const score = computeReputationScore({
      reviewCount: 0,
      certifiedBangerCount: 2,
      netVotesReceived: 0,
      votesCastByDay: [],
    });
    expect(score).toBe(50);
  });

  it("adds net votes received 1:1", () => {
    const score = computeReputationScore({
      reviewCount: 0,
      certifiedBangerCount: 0,
      netVotesReceived: 40,
      votesCastByDay: [],
    });
    expect(score).toBe(40);
  });

  it("caps vote-casting engagement points at 10 per day, even with more votes that day", () => {
    const score = computeReputationScore({
      reviewCount: 0,
      certifiedBangerCount: 0,
      netVotesReceived: 0,
      votesCastByDay: [15], // one day, 15 votes cast -> capped at 10
    });
    expect(score).toBe(10);
  });

  it("sums the per-day cap across multiple days independently", () => {
    const score = computeReputationScore({
      reviewCount: 0,
      certifiedBangerCount: 0,
      netVotesReceived: 0,
      votesCastByDay: [15, 3, 20], // capped 10 + 3 + capped 10 = 23
    });
    expect(score).toBe(23);
  });

  it("combines every source of points together", () => {
    const score = computeReputationScore({
      reviewCount: 2, // 4
      certifiedBangerCount: 1, // 25
      netVotesReceived: 10, // 10
      votesCastByDay: [5, 12], // 5 + 10 = 15
    });
    expect(score).toBe(4 + 25 + 10 + 15);
  });

  it("floors at zero when net votes received are strongly negative", () => {
    const score = computeReputationScore({
      reviewCount: 1, // 2
      certifiedBangerCount: 0,
      netVotesReceived: -100,
      votesCastByDay: [],
    });
    expect(score).toBe(0);
  });
});
