import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// Precomputed aggregates, updated incrementally whenever a review's
// published state or scores change — never recalculated live on read
// (Journal Entry 39). Only PUBLISHED reviews count (Entry 42: a pending
// admin review isn't visible/votable/seal-eligible, so it shouldn't move
// the title's aggregate either). Accepts either the top-level client or a
// $transaction client so callers already inside a transaction (submitReview,
// mergeTitles) don't need a second round-trip.
export async function recomputeTitleAggregates(
  titleId: string,
  client: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const [reviewCount, grouped, latest] = await Promise.all([
    client.review.count({ where: { titleId, approvalStatus: "PUBLISHED" } }),
    client.reviewCategoryScore.groupBy({
      by: ["categoryId"],
      where: { review: { titleId, approvalStatus: "PUBLISHED" } },
      _avg: { score: true },
    }),
    client.review.findFirst({
      where: { titleId, approvalStatus: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const avgCategoryScores = Object.fromEntries(
    grouped.map((g) => [
      g.categoryId,
      g._avg.score !== null ? Math.round(g._avg.score * 100) / 100 : null,
    ]),
  );

  // WP5.1's "highest overall score" sort reads this directly instead of
  // recomputing from the avgCategoryScores JSON blob on every page render.
  const scoreValues = Object.values(avgCategoryScores).filter(
    (v): v is number => typeof v === "number",
  );
  const communityScore =
    scoreValues.length > 0
      ? Math.round((scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length) * 100) / 100
      : null;

  await client.title.update({
    where: { id: titleId },
    data: {
      reviewCount,
      avgCategoryScores,
      communityScore,
      lastReviewedAt: latest?.createdAt ?? null,
    },
  });
}

// Same precomputed-aggregate pattern, for the named seal count Entry 39
// calls out. Matched by SealType.name rather than a generic per-type tally,
// since the schema only carries this one specific named column — v1 has
// exactly one seal type (Entry 14, Entry 45 removed Hidden Gem). Counts
// both PROVISIONAL and PERMANENT SealAward rows: a seal is visible on a
// review from the moment it's granted, not just once it converts to
// permanent (Phase 1 admin grants are PERMANENT immediately anyway, Entry
// 11 — this only starts to matter once WP4.2's Phase 2 provisional grants
// exist).
export async function recomputeTitleSealCounts(
  titleId: string,
  client: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const certifiedBangerType = await client.sealType.findUnique({
    where: { name: "Certified Banger" },
  });

  const certifiedBangerCount = certifiedBangerType
    ? await client.sealAward.count({
        where: { sealTypeId: certifiedBangerType.id, review: { titleId } },
      })
    : 0;

  await client.title.update({
    where: { id: titleId },
    data: { certifiedBangerCount },
  });
}

// WP5.1's "most discussed" sort. Called from src/lib/actions/comments.ts
// after a comment is created — comments have no approval gate of their
// own (Comment has no approvalStatus field), but still only count toward
// a title's discussion total while the parent review is PUBLISHED.
export async function recomputeTitleDiscussionCount(
  titleId: string,
  client: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const discussionCount = await client.comment.count({
    where: { review: { titleId, approvalStatus: "PUBLISHED" } },
  });
  await client.title.update({ where: { id: titleId }, data: { discussionCount } });
}
