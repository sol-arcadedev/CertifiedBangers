import { describe, it, expect, vi, beforeEach } from "vitest";
import { voteOnReview } from "./votes";

// vi.mock factories are hoisted above regular imports/consts, so
// vi.hoisted() is needed to define the mock fns they close over.
const {
  reviewFindUnique,
  reviewUpdate,
  voteFindUnique,
  voteCreate,
  voteUpdate,
  voteDelete,
  voteCount,
  requireUser,
  checkAutoSealCandidacy,
  checkVoteRateLimit,
  recomputeUserReputation,
  revalidatePath,
} = vi.hoisted(() => ({
  reviewFindUnique: vi.fn(),
  reviewUpdate: vi.fn(),
  voteFindUnique: vi.fn(),
  voteCreate: vi.fn(),
  voteUpdate: vi.fn(),
  voteDelete: vi.fn(),
  voteCount: vi.fn(),
  requireUser: vi.fn(),
  checkAutoSealCandidacy: vi.fn(),
  checkVoteRateLimit: vi.fn(),
  recomputeUserReputation: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findUnique: reviewFindUnique, update: reviewUpdate },
    vote: { findUnique: voteFindUnique, create: voteCreate, update: voteUpdate, delete: voteDelete, count: voteCount },
  },
}));
vi.mock("@/lib/require-user", () => ({ requireUser }));
vi.mock("@/lib/seal-probation", () => ({ checkAutoSealCandidacy }));
vi.mock("@/lib/rate-limit", () => ({ checkVoteRateLimit }));
vi.mock("@/lib/user-reputation", () => ({ recomputeUserReputation }));
vi.mock("next/cache", () => ({ revalidatePath }));

const VOTER = { id: "voter-1" };
const REVIEW = { id: "review-1", userId: "author-1", approvalStatus: "PUBLISHED" };

describe("voteOnReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(VOTER);
    voteCount.mockResolvedValue(0);
    checkVoteRateLimit.mockResolvedValue({ allowed: true });
  });

  it("does nothing if the review doesn't exist", async () => {
    reviewFindUnique.mockResolvedValue(null);

    await voteOnReview("missing", "title-1", "UP");

    expect(voteCreate).not.toHaveBeenCalled();
    expect(reviewUpdate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does nothing if the review isn't PUBLISHED", async () => {
    reviewFindUnique.mockResolvedValue({ ...REVIEW, approvalStatus: "PENDING_APPROVAL" });

    await voteOnReview(REVIEW.id, "title-1", "UP");

    expect(voteCreate).not.toHaveBeenCalled();
  });

  it("blocks voting on your own review", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    requireUser.mockResolvedValue({ id: REVIEW.userId }); // same as review author

    await voteOnReview(REVIEW.id, "title-1", "UP");

    expect(voteFindUnique).not.toHaveBeenCalled();
    expect(voteCreate).not.toHaveBeenCalled();
  });

  it("creates a new vote when none exists and the rate limit allows it", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    voteFindUnique.mockResolvedValue(null);
    checkVoteRateLimit.mockResolvedValue({ allowed: true });

    await voteOnReview(REVIEW.id, "title-1", "UP");

    expect(voteCreate).toHaveBeenCalledWith({
      data: { userId: VOTER.id, targetType: "REVIEW", targetId: REVIEW.id, value: "UP" },
    });
    expect(voteUpdate).not.toHaveBeenCalled();
    expect(voteDelete).not.toHaveBeenCalled();
  });

  it("does not create a vote when a brand-new vote would exceed the rate limit", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    voteFindUnique.mockResolvedValue(null);
    checkVoteRateLimit.mockResolvedValue({ allowed: false, reason: "too many votes" });

    await voteOnReview(REVIEW.id, "title-1", "UP");

    expect(voteCreate).not.toHaveBeenCalled();
    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  it("removes the vote when clicking the same arrow again (toggle off)", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    voteFindUnique.mockResolvedValue({ id: "vote-1", value: "UP" });

    await voteOnReview(REVIEW.id, "title-1", "UP");

    expect(voteDelete).toHaveBeenCalledWith({ where: { id: "vote-1" } });
    expect(voteCreate).not.toHaveBeenCalled();
    expect(voteUpdate).not.toHaveBeenCalled();
  });

  it("switches the vote when clicking the other arrow, without checking the rate limit", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    voteFindUnique.mockResolvedValue({ id: "vote-1", value: "UP" });

    await voteOnReview(REVIEW.id, "title-1", "DOWN");

    expect(voteUpdate).toHaveBeenCalledWith({ where: { id: "vote-1" }, data: { value: "DOWN" } });
    expect(voteCreate).not.toHaveBeenCalled();
    expect(voteDelete).not.toHaveBeenCalled();
    expect(checkVoteRateLimit).not.toHaveBeenCalled();
  });

  it("recomputes reputation for both the voter and the review's author after a successful vote", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    voteFindUnique.mockResolvedValue(null);

    await voteOnReview(REVIEW.id, "title-1", "UP");

    expect(recomputeUserReputation).toHaveBeenCalledWith(REVIEW.userId);
    expect(recomputeUserReputation).toHaveBeenCalledWith(VOTER.id);
    expect(recomputeUserReputation).toHaveBeenCalledTimes(2);
  });

  it("checks seal candidacy and revalidates the title page after a successful vote", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    voteFindUnique.mockResolvedValue(null);

    await voteOnReview(REVIEW.id, "title-9", "UP");

    expect(checkAutoSealCandidacy).toHaveBeenCalledWith(REVIEW.id);
    expect(revalidatePath).toHaveBeenCalledWith("/titles/title-9");
  });
});
