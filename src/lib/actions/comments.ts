"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { recomputeTitleDiscussionCount } from "@/lib/title-aggregates";
import { checkCommentRateLimit } from "@/lib/rate-limit";

export type CommentActionState = { error?: string } | undefined;

// Flat (non-threaded), no approval gate — Comment has no approvalStatus
// field, unlike Review; only the account-being-logged-in requirement
// applies (Entry 3), not the review-submission-specific age/email gate
// (Entry 40 is scoped to reviews, not comments).
export async function submitComment(
  reviewId: string,
  titleId: string,
  _prevState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const user = await requireUser();

  const rateLimit = await checkCommentRateLimit(user.id);
  if (!rateLimit.allowed) return { error: rateLimit.reason };

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.approvalStatus !== "PUBLISHED") {
    return { error: "This review isn't available for comments." };
  }

  const bodyText = String(formData.get("bodyText") ?? "").trim();
  if (!bodyText) return { error: "Comment can't be empty." };

  await prisma.comment.create({ data: { userId: user.id, reviewId, bodyText } });
  await recomputeTitleDiscussionCount(titleId);

  revalidatePath(`/titles/${titleId}`);
}
