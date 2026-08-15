"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireMainAdmin } from "@/lib/require-admin";
import { recomputeTitleAggregates, recomputeTitleDiscussionCount } from "@/lib/title-aggregates";
import type { UserStatus } from "@/generated/prisma/enums";

// Triage only — doesn't touch the reported content. Any admin can do this,
// same tier as title editing/seal granting (WP1.2/WP4.1), not a
// governance-level action.
export async function resolveReport(reportId: string, status: "RESOLVED" | "DISMISSED") {
  await requireAdmin();
  await prisma.report.update({ where: { id: reportId }, data: { status } });
  revalidatePath("/admin/reports");
}

// Rejecting a review is Main-Admin-only regardless of entry point (Entry
// 28's approval queue enforces the same rule) — reuses the same
// approvalStatus=REJECTED hidden-state pipeline rather than hard-deleting,
// so votes/comments/seals already attached to it aren't orphaned.
export async function removeReportedReview(reportId: string, reviewId: string) {
  await requireMainAdmin();
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { approvalStatus: "REJECTED" },
  });
  await recomputeTitleAggregates(review.titleId);
  await prisma.report.update({ where: { id: reportId }, data: { status: "RESOLVED" } });
  revalidatePath("/admin/reports");
  revalidatePath(`/titles/${review.titleId}`);
}

// Comments carry no approval/soft-delete state (unlike reviews), and
// nothing else references them at the DB level (Vote.commentId is
// nullable and comment-voting was never built), so a hard delete is safe
// and simplest. Any admin can do this — no Entry-28-style restriction
// exists for comments.
export async function removeReportedComment(reportId: string, commentId: string) {
  await requireAdmin();
  const comment = await prisma.comment.delete({
    where: { id: commentId },
    include: { review: { select: { titleId: true } } },
  });
  await recomputeTitleDiscussionCount(comment.review.titleId);
  await prisma.report.update({ where: { id: reportId }, data: { status: "RESOLVED" } });
  revalidatePath("/admin/reports");
  revalidatePath(`/titles/${comment.review.titleId}`);
}

// Any admin can suspend/ban a regular user (same tier as other
// content-moderation actions), but touching another admin's or the Main
// Admin's status requires the Main Admin — mirrors how only the Main
// Admin manages admin trust (Entry 41) via /admin/admins, so a rogue
// admin can't silence a peer or lock out the founder.
export async function setUserStatus(userId: string, status: UserStatus) {
  const actor = await requireAdmin();
  if (actor.id === userId) throw new Error("You can't change your own account status.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found.");

  if (target.role !== "USER" && actor.role !== "MAIN_ADMIN") {
    throw new Error("Only the Main Admin can change another admin's status.");
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/users");
}
