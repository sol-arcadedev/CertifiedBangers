"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { checkReviewGate } from "@/lib/review-gate";

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

// Submits or replaces the current user's review for a title — one review
// per user per title (schema unique constraint), editing replaces rather
// than duplicating. Category scores are data-driven per Category's own
// scaleMin/scaleMax, restricted to categories that apply to this title's
// type (Journal Entry 2).
export async function submitReview(
  titleId: string,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireUser();

  const gate = await checkReviewGate(user.id, user.createdAt);
  if (!gate.allowed) return { error: gate.reason };

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
  });

  revalidatePath(`/titles/${titleId}`);
}
