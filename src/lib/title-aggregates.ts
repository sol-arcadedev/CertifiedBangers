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
  const [reviewCount, grouped] = await Promise.all([
    client.review.count({ where: { titleId, approvalStatus: "PUBLISHED" } }),
    client.reviewCategoryScore.groupBy({
      by: ["categoryId"],
      where: { review: { titleId, approvalStatus: "PUBLISHED" } },
      _avg: { score: true },
    }),
  ]);

  const avgCategoryScores = Object.fromEntries(
    grouped.map((g) => [
      g.categoryId,
      g._avg.score !== null ? Math.round(g._avg.score * 100) / 100 : null,
    ]),
  );

  await client.title.update({
    where: { id: titleId },
    data: { reviewCount, avgCategoryScores },
  });
}
