"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { checkAutoSealCandidacy } from "@/lib/seal-probation";
import { checkVoteRateLimit } from "@/lib/rate-limit";
import { VoteValue } from "@/generated/prisma/enums";

// Precomputed from the Vote table (same incremental-aggregate pattern as
// Title's scores, Entry 39) — never recalculated live on read.
async function recomputeReviewVoteCounts(reviewId: string) {
  const [upvoteCount, downvoteCount] = await Promise.all([
    prisma.vote.count({ where: { targetType: "REVIEW", targetId: reviewId, value: "UP" } }),
    prisma.vote.count({ where: { targetType: "REVIEW", targetId: reviewId, value: "DOWN" } }),
  ]);
  await prisma.review.update({ where: { id: reviewId }, data: { upvoteCount, downvoteCount } });
}

// Click the same arrow again to remove your vote; click the other arrow to
// switch it. Voting on your own review is blocked — the same "don't make it
// easy to game credibility" reasoning the brief applies to seals (Section 5)
// applies to a review's own helpfulness score.
export async function voteOnReview(reviewId: string, titleId: string, value: VoteValue) {
  const user = await requireUser();

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.approvalStatus !== "PUBLISHED") return;
  if (review.userId === user.id) return;

  const existing = await prisma.vote.findUnique({
    where: {
      userId_targetType_targetId: { userId: user.id, targetType: "REVIEW", targetId: reviewId },
    },
  });

  if (existing?.value === value) {
    await prisma.vote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.vote.update({ where: { id: existing.id }, data: { value } });
  } else {
    // Only a brand-new vote burns rate-limit budget — undoing (delete,
    // above) or switching (update, above) your own vote doesn't.
    const rateLimit = await checkVoteRateLimit(user.id);
    if (!rateLimit.allowed) return;
    await prisma.vote.create({
      data: { userId: user.id, targetType: "REVIEW", targetId: reviewId, value },
    });
  }

  await recomputeReviewVoteCounts(reviewId);
  await checkAutoSealCandidacy(reviewId);
  revalidatePath(`/titles/${titleId}`);
}
