import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitReview, submitReviewForAniListTitle } from "./reviews";

const {
  titleFindUnique,
  categoryFindMany,
  reviewFindUnique,
  transaction,
  txReviewFindUnique,
  txReviewUpdate,
  txReviewCreate,
  txReviewCount,
  txScoreDeleteMany,
  txScoreCreateMany,
  requireUser,
  checkReviewGate,
  checkReviewRateLimit,
  recomputeTitleAggregates,
  recomputeUserReputation,
  performAniListImport,
  revalidatePath,
  redirect,
} = vi.hoisted(() => ({
  titleFindUnique: vi.fn(),
  categoryFindMany: vi.fn(),
  reviewFindUnique: vi.fn(),
  transaction: vi.fn(),
  txReviewFindUnique: vi.fn(),
  txReviewUpdate: vi.fn(),
  txReviewCreate: vi.fn(),
  txReviewCount: vi.fn(),
  txScoreDeleteMany: vi.fn(),
  txScoreCreateMany: vi.fn(),
  requireUser: vi.fn(),
  checkReviewGate: vi.fn(),
  checkReviewRateLimit: vi.fn(),
  recomputeTitleAggregates: vi.fn(),
  recomputeUserReputation: vi.fn(),
  performAniListImport: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

const txClient = {
  review: {
    findUnique: txReviewFindUnique,
    update: txReviewUpdate,
    create: txReviewCreate,
    count: txReviewCount,
  },
  reviewCategoryScore: { deleteMany: txScoreDeleteMany, createMany: txScoreCreateMany },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    title: { findUnique: titleFindUnique },
    category: { findMany: categoryFindMany },
    review: { findUnique: reviewFindUnique },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/require-user", () => ({ requireUser }));
vi.mock("@/lib/review-gate", () => ({ checkReviewGate }));
vi.mock("@/lib/rate-limit", () => ({ checkReviewRateLimit }));
vi.mock("@/lib/title-aggregates", () => ({ recomputeTitleAggregates }));
vi.mock("@/lib/user-reputation", () => ({ recomputeUserReputation }));
vi.mock("@/lib/actions/anilist-import", () => ({ performAniListImport }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

const USER = { id: "user-1", createdAt: new Date("2020-01-01"), role: "USER", adminReviewsRequireApproval: true };
const TITLE = { id: "title-1", type: "MANGA" };
const CATEGORIES = [
  { id: "cat-art", name: "Art Style", scaleMin: 1, scaleMax: 10 },
  { id: "cat-plot", name: "Plot", scaleMin: 1, scaleMax: 10 },
];

// Pass "" for a score field to simulate it being omitted from the form
// entirely (formData.get() returns null for a field that was never set).
function buildFormData(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    bodyText: "x".repeat(60),
    spoilerText: "",
    "score_cat-art": "8",
    "score_cat-plot": "7",
  };
  const merged = { ...defaults, ...overrides };

  const fd = new FormData();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== "" || key === "bodyText" || key === "spoilerText") fd.set(key, value);
  }
  return fd;
}

describe("submitReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(USER);
    checkReviewGate.mockResolvedValue({ allowed: true });
    checkReviewRateLimit.mockResolvedValue({ allowed: true });
    reviewFindUnique.mockResolvedValue(null); // no existing review -> "new" for rate-limit purposes
    titleFindUnique.mockResolvedValue(TITLE);
    categoryFindMany.mockResolvedValue(CATEGORIES);
    txReviewFindUnique.mockResolvedValue(null);
    txReviewCount.mockResolvedValue(0);
    txReviewCreate.mockResolvedValue({ id: "review-new" });
    txReviewUpdate.mockResolvedValue({ id: "existing-review" });
    transaction.mockImplementation((cb: (tx: typeof txClient) => Promise<unknown>) => cb(txClient));
  });

  it("blocks submission when the review gate disallows it, without checking the rate limit", async () => {
    checkReviewGate.mockResolvedValue({ allowed: false, reason: "too new" });

    const result = await submitReview(TITLE.id, undefined, buildFormData());

    expect(result).toEqual({ error: "too new" });
    expect(checkReviewRateLimit).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("blocks a brand-new review when the rate limit is exceeded", async () => {
    checkReviewRateLimit.mockResolvedValue({ allowed: false, reason: "slow down" });

    const result = await submitReview(TITLE.id, undefined, buildFormData());

    expect(result).toEqual({ error: "slow down" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("does not rate-limit editing an existing review", async () => {
    reviewFindUnique.mockResolvedValue({ id: "existing-review" }); // user already has one -> not "new"

    await submitReview(TITLE.id, undefined, buildFormData());

    expect(checkReviewRateLimit).not.toHaveBeenCalled();
  });

  it("errors when the title doesn't exist", async () => {
    titleFindUnique.mockResolvedValue(null);

    const result = await submitReview(TITLE.id, undefined, buildFormData());

    expect(result).toEqual({ error: "Title not found." });
  });

  it("errors when no categories are configured for the title's type", async () => {
    categoryFindMany.mockResolvedValue([]);

    const result = await submitReview(TITLE.id, undefined, buildFormData());

    expect(result?.error).toMatch(/no rating categories/i);
  });

  it("errors when the review body is too short", async () => {
    const result = await submitReview(TITLE.id, undefined, buildFormData({ bodyText: "too short" }));

    expect(result?.error).toMatch(/at least 50 characters/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("errors when a category score is missing", async () => {
    const result = await submitReview(TITLE.id, undefined, buildFormData({ "score_cat-plot": "" }));

    expect(result?.error).toMatch(/Plot score must be between/i);
  });

  it("errors when a category score is out of range", async () => {
    const result = await submitReview(TITLE.id, undefined, buildFormData({ "score_cat-art": "99" }));

    expect(result?.error).toMatch(/Art Style score must be between/i);
  });

  it("creates a new review with the averaged overall score and replaces category scores", async () => {
    const result = await submitReview(TITLE.id, undefined, buildFormData());

    expect(result).toBeUndefined(); // no error = success
    expect(txReviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER.id,
          titleId: TITLE.id,
          overallScore: 7.5, // (8 + 7) / 2
          isFirstReviewOfTitle: true,
        }),
      }),
    );
    expect(txScoreDeleteMany).toHaveBeenCalledWith({ where: { reviewId: "review-new" } });
    expect(txScoreCreateMany).toHaveBeenCalled();
    expect(recomputeTitleAggregates).toHaveBeenCalledWith(TITLE.id, txClient);
    expect(recomputeUserReputation).toHaveBeenCalledWith(USER.id, txClient);
    expect(revalidatePath).toHaveBeenCalledWith(`/titles/${TITLE.id}`);
  });

  it("updates rather than creates when the user already has a review for this title", async () => {
    txReviewFindUnique.mockResolvedValue({ id: "existing-review", approvalStatus: "PUBLISHED" });

    await submitReview(TITLE.id, undefined, buildFormData());

    expect(txReviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "existing-review" } }),
    );
    expect(txReviewCreate).not.toHaveBeenCalled();
  });

  it("preserves an already-PUBLISHED review's approval status on edit rather than recomputing it", async () => {
    txReviewFindUnique.mockResolvedValue({ id: "existing-review", approvalStatus: "PUBLISHED" });

    await submitReview(TITLE.id, undefined, buildFormData());

    expect(txReviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approvalStatus: "PUBLISHED" }) }),
    );
  });

  it("re-runs approval routing when resubmitting a previously-REJECTED review", async () => {
    txReviewFindUnique.mockResolvedValue({ id: "existing-review", approvalStatus: "REJECTED" });

    await submitReview(TITLE.id, undefined, buildFormData());

    // USER is role "USER" -> computeApprovalStatus always returns PUBLISHED for them.
    expect(txReviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approvalStatus: "PUBLISHED" }) }),
    );
  });
});

describe("submitReviewForAniListTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(USER);
    checkReviewGate.mockResolvedValue({ allowed: true });
    checkReviewRateLimit.mockResolvedValue({ allowed: true });
    titleFindUnique.mockResolvedValue(TITLE);
    categoryFindMany.mockResolvedValue(CATEGORIES);
    txReviewFindUnique.mockResolvedValue(null);
    txReviewCount.mockResolvedValue(0);
    txReviewCreate.mockResolvedValue({ id: "review-new" });
    transaction.mockImplementation((cb: (tx: typeof txClient) => Promise<unknown>) => cb(txClient));
    performAniListImport.mockResolvedValue({ titleId: TITLE.id });
  });

  it("blocks on the review gate before ever attempting the AniList import", async () => {
    checkReviewGate.mockResolvedValue({ allowed: false, reason: "too new" });

    const result = await submitReviewForAniListTitle(12345, undefined, buildFormData());

    expect(result).toEqual({ error: "too new" });
    expect(performAniListImport).not.toHaveBeenCalled();
  });

  it("always checks the rate limit (no conditional skip, unlike submitReview)", async () => {
    checkReviewRateLimit.mockResolvedValue({ allowed: false, reason: "slow down" });

    const result = await submitReviewForAniListTitle(12345, undefined, buildFormData());

    expect(result).toEqual({ error: "slow down" });
    expect(performAniListImport).not.toHaveBeenCalled();
  });

  it("returns the import error directly if the AniList import fails", async () => {
    performAniListImport.mockResolvedValue({ error: "That title could not be found on AniList." });

    const result = await submitReviewForAniListTitle(12345, undefined, buildFormData());

    expect(result).toEqual({ error: "That title could not be found on AniList." });
    expect(transaction).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a validation error from review creation without redirecting", async () => {
    const result = await submitReviewForAniListTitle(12345, undefined, buildFormData({ bodyText: "short" }));

    expect(result?.error).toMatch(/at least 50 characters/i);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to the imported title's review section on success", async () => {
    await submitReviewForAniListTitle(12345, undefined, buildFormData());

    expect(redirect).toHaveBeenCalledWith(`/titles/${TITLE.id}#review`);
  });
});
