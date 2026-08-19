"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";
import { requireUser } from "@/lib/require-user";
import { checkReviewGate } from "@/lib/review-gate";
import { checkReviewRateLimit } from "@/lib/rate-limit";
import { recomputeTitleAggregates } from "@/lib/title-aggregates";
import { performAniListImport } from "@/lib/actions/anilist-import";

export type ReviewActionState = { error?: string } | undefined;

const MIN_BODY_LENGTH = 50;

// Entry 28: only non-Main-Admin admin reviews are gated; Main Admin (no one
// above them to approve against) and regular users are unaffected. Entry 41:
// the per-admin exemption (adminReviewsRequireApproval=false) is a manual
// trust call, not automatic.
function computeApprovalStatus(user: { role: string; adminReviewsRequireApproval: boolean }) {
  return {
    isAdminAuthored: user.role !== "USER",
    approvalStatus:
      user.role === "ADMIN" && user.adminReviewsRequireApproval
        ? ("PENDING_APPROVAL" as const)
        : ("PUBLISHED" as const),
  };
}

// Shared by submitReview (existing title) and submitReviewForAniListTitle
// (title imported on the fly, below) — everything past "we have a real
// titleId and a gate/rate-limit-cleared user" is identical.
async function createOrUpdateReview(
  user: User,
  titleId: string,
  formData: FormData,
): Promise<ReviewActionState> {
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) return { error: "Title not found." };

  const categories = await prisma.category.findMany({
    where: { appliesToType: { has: title.type } },
  });
  if (categories.length === 0) {
    return { error: "No rating categories are configured for this title type." };
  }

  const bodyText = String(formData.get("bodyText") ?? "").trim();
  if (bodyText.length < MIN_BODY_LENGTH) {
    return { error: `Review must be at least ${MIN_BODY_LENGTH} characters.` };
  }
  const spoilerFlag = formData.get("spoilerFlag") === "on";

  const scores: { categoryId: string; score: number }[] = [];
  for (const category of categories) {
    const raw = formData.get(`score_${category.id}`);
    const score = Number(raw);
    if (!raw || !Number.isInteger(score) || score < category.scaleMin || score > category.scaleMax) {
      return {
        error: `${category.name} score must be between ${category.scaleMin} and ${category.scaleMax}.`,
      };
    }
    scores.push({ categoryId: category.id, score });
  }

  const overallScore =
    Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.review.findUnique({
      where: { userId_titleId: { userId: user.id, titleId } },
    });

    const isFirstReviewOfTitle =
      !existing && (await tx.review.count({ where: { titleId } })) === 0;

    const { isAdminAuthored, approvalStatus } = computeApprovalStatus(user);

    const review = existing
      ? await tx.review.update({
          where: { id: existing.id },
          data: {
            bodyText,
            spoilerFlag,
            overallScore,
            isAdminAuthored,
            // Entry 42's approval gate only needs to re-run on resubmission
            // after a rejection — an already-published or already-pending
            // review shouldn't flip state just because it was edited.
            approvalStatus: existing.approvalStatus === "REJECTED" ? approvalStatus : existing.approvalStatus,
          },
        })
      : await tx.review.create({
          data: {
            userId: user.id,
            titleId,
            bodyText,
            spoilerFlag,
            overallScore,
            isFirstReviewOfTitle,
            isAdminAuthored,
            approvalStatus,
          },
        });

    await tx.reviewCategoryScore.deleteMany({ where: { reviewId: review.id } });
    await tx.reviewCategoryScore.createMany({
      data: scores.map((s) => ({
        reviewId: review.id,
        categoryId: s.categoryId,
        score: s.score,
      })),
    });

    // Cheap to always recompute rather than branch on whether this
    // submission actually changed a PUBLISHED review's scores.
    await recomputeTitleAggregates(titleId, tx);
  });

  revalidatePath(`/titles/${titleId}`);
}

// Submits or replaces the current user's review for a title already in
// our catalog — one review per user per title (schema unique constraint),
// editing replaces rather than duplicating.
export async function submitReview(
  titleId: string,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireUser();

  const gate = await checkReviewGate(user.id, user.createdAt);
  if (!gate.allowed) return { error: gate.reason };

  // Rate-limit new reviews only — editing an existing one (edit-replace)
  // doesn't grow content volume, so it isn't gated here.
  const isNewReview =
    (await prisma.review.findUnique({ where: { userId_titleId: { userId: user.id, titleId } } })) ===
    null;
  if (isNewReview) {
    const rateLimit = await checkReviewRateLimit(user.id);
    if (!rateLimit.allowed) return { error: rateLimit.reason };
  }

  return createOrUpdateReview(user, titleId, formData);
}

// Entry point for the AniList preview page (src/app/titles/anilist/
// [anilistId]) — the title isn't in our catalog yet, so writing a review
// for it imports it first. Deliberately not admin-gated: a genuine,
// gate-passing, rate-limited review submission is itself the appropriate
// bar for "this title belongs in the catalog" (the user's own stated
// vision — community-driven, not admin-curated). Always a brand-new
// review by construction (the title didn't exist a moment ago, so no
// prior review of it could exist either), so the rate limit always
// applies, unlike submitReview's conditional check.
export async function submitReviewForAniListTitle(
  anilistId: number,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireUser();

  const gate = await checkReviewGate(user.id, user.createdAt);
  if (!gate.allowed) return { error: gate.reason };

  const rateLimit = await checkReviewRateLimit(user.id);
  if (!rateLimit.allowed) return { error: rateLimit.reason };

  const imported = await performAniListImport(anilistId);
  if ("error" in imported) return imported;

  const result = await createOrUpdateReview(user, imported.titleId, formData);
  if (result?.error) return result;

  redirect(`/titles/${imported.titleId}#review`);
}
