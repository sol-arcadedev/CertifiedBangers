import { describe, it, expect, vi, beforeEach } from "vitest";
import { grantSeal, revokeSeal } from "./seals";

// vi.mock factories are hoisted above regular imports/consts, so
// vi.hoisted() is needed to define the mock fns they close over.
const {
  reviewFindUnique,
  sealTypeFindUnique,
  sealAwardFindUnique,
  sealAwardCreate,
  sealAwardDelete,
  requireAdmin,
  maybeSetDiscoveredBy,
  recomputeTitleSealCounts,
  recomputeUserReputation,
  revalidatePath,
} = vi.hoisted(() => ({
  reviewFindUnique: vi.fn(),
  sealTypeFindUnique: vi.fn(),
  sealAwardFindUnique: vi.fn(),
  sealAwardCreate: vi.fn(),
  sealAwardDelete: vi.fn(),
  requireAdmin: vi.fn(),
  maybeSetDiscoveredBy: vi.fn(),
  recomputeTitleSealCounts: vi.fn(),
  recomputeUserReputation: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findUnique: reviewFindUnique },
    sealType: { findUnique: sealTypeFindUnique },
    sealAward: { findUnique: sealAwardFindUnique, create: sealAwardCreate, delete: sealAwardDelete },
  },
}));
vi.mock("@/lib/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/title-aggregates", () => ({ maybeSetDiscoveredBy, recomputeTitleSealCounts }));
vi.mock("@/lib/user-reputation", () => ({ recomputeUserReputation }));
vi.mock("next/cache", () => ({ revalidatePath }));

const ADMIN = { id: "admin-1" };
const REVIEW = { id: "review-1", userId: "author-1", titleId: "title-1", approvalStatus: "PUBLISHED" };
const CERTIFIED_BANGER = { id: "seal-cb", name: "Certified Banger" };

function formDataWith(justificationText: string) {
  const fd = new FormData();
  fd.set("justificationText", justificationText);
  return fd;
}

describe("grantSeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue(ADMIN);
  });

  it("errors when the review doesn't exist", async () => {
    reviewFindUnique.mockResolvedValue(null);

    const result = await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("great review"));

    expect(result).toEqual({ error: "This review isn't available for seals." });
    expect(sealAwardCreate).not.toHaveBeenCalled();
  });

  it("errors when the review isn't PUBLISHED", async () => {
    reviewFindUnique.mockResolvedValue({ ...REVIEW, approvalStatus: "PENDING_APPROVAL" });

    const result = await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("great review"));

    expect(result).toEqual({ error: "This review isn't available for seals." });
  });

  it("errors when the seal type doesn't exist", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(null);

    const result = await grantSeal(REVIEW.id, "missing-seal", undefined, formDataWith("great review"));

    expect(result).toEqual({ error: "Seal type not found." });
  });

  it("errors when the justification is empty", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(CERTIFIED_BANGER);

    const result = await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("   "));

    expect(result).toEqual({ error: "A justification is required to grant a seal." });
    expect(sealAwardCreate).not.toHaveBeenCalled();
  });

  it("errors when the review already has this seal type", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(CERTIFIED_BANGER);
    sealAwardFindUnique.mockResolvedValue({ id: "existing-award" });

    const result = await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("great review"));

    expect(result).toEqual({ error: "This review already has the Certified Banger seal." });
    expect(sealAwardCreate).not.toHaveBeenCalled();
  });

  it("creates a PERMANENT, ADMIN-granted seal award on success", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(CERTIFIED_BANGER);
    sealAwardFindUnique.mockResolvedValue(null);

    await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("great review"));

    expect(sealAwardCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reviewId: REVIEW.id,
        sealTypeId: CERTIFIED_BANGER.id,
        justificationText: "great review",
        grantedVia: "ADMIN",
        grantedByAdminId: ADMIN.id,
        status: "PERMANENT",
      }),
    });
  });

  it("recomputes aggregates and revalidates both pages on success", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(CERTIFIED_BANGER);
    sealAwardFindUnique.mockResolvedValue(null);

    await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("great review"));

    expect(recomputeTitleSealCounts).toHaveBeenCalledWith(REVIEW.titleId);
    expect(recomputeUserReputation).toHaveBeenCalledWith(REVIEW.userId);
    expect(revalidatePath).toHaveBeenCalledWith(`/titles/${REVIEW.titleId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/seals");
  });

  it("sets discovered-by credit when the granted seal is Certified Banger", async () => {
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(CERTIFIED_BANGER);
    sealAwardFindUnique.mockResolvedValue(null);

    await grantSeal(REVIEW.id, CERTIFIED_BANGER.id, undefined, formDataWith("great review"));

    expect(maybeSetDiscoveredBy).toHaveBeenCalledWith(REVIEW.titleId, REVIEW.userId);
  });

  it("does not set discovered-by credit for a non-Certified-Banger seal type", async () => {
    const otherSeal = { id: "seal-other", name: "Hidden Gem" };
    reviewFindUnique.mockResolvedValue(REVIEW);
    sealTypeFindUnique.mockResolvedValue(otherSeal);
    sealAwardFindUnique.mockResolvedValue(null);

    await grantSeal(REVIEW.id, otherSeal.id, undefined, formDataWith("great review"));

    expect(maybeSetDiscoveredBy).not.toHaveBeenCalled();
  });
});

describe("revokeSeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue(ADMIN);
  });

  it("does nothing if the seal award doesn't exist", async () => {
    sealAwardFindUnique.mockResolvedValue(null);

    await revokeSeal("missing-award");

    expect(sealAwardDelete).not.toHaveBeenCalled();
    expect(recomputeTitleSealCounts).not.toHaveBeenCalled();
  });

  it("deletes the award, recomputes aggregates, and revalidates on success", async () => {
    sealAwardFindUnique.mockResolvedValue({
      id: "award-1",
      review: { titleId: "title-1", userId: "author-1" },
    });

    await revokeSeal("award-1");

    expect(sealAwardDelete).toHaveBeenCalledWith({ where: { id: "award-1" } });
    expect(recomputeTitleSealCounts).toHaveBeenCalledWith("title-1");
    expect(recomputeUserReputation).toHaveBeenCalledWith("author-1");
    expect(revalidatePath).toHaveBeenCalledWith("/titles/title-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/seals");
  });

  it("never touches discovered-by credit — revoking a seal doesn't reassign it (Entry 71)", async () => {
    sealAwardFindUnique.mockResolvedValue({
      id: "award-1",
      review: { titleId: "title-1", userId: "author-1" },
    });

    await revokeSeal("award-1");

    expect(maybeSetDiscoveredBy).not.toHaveBeenCalled();
  });
});
