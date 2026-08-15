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

// Same precomputed-aggregate pattern, for the two named seal counts Entry
// 39 explicitly calls out. Matched by SealType.name rather than a generic
// per-type tally, since the schema only carries these two specific named
// columns — v1 has exactly two seal types (Entry 14). Counts both
// PROVISIONAL and PERMANENT SealAward rows: a seal is visible on a review
// from the moment it's granted, not just once it converts to permanent
// (Phase 1 admin grants are PERMANENT immediately anyway, Entry 11 — this
// only starts to matter once WP4.2's Phase 2 provisional grants exist).
export async function recomputeTitleSealCounts(
  titleId: string,
  client: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const sealTypes = await client.sealType.findMany({
    where: { name: { in: ["Certified Banger", "Hidden Gem"] } },
  });
  const certifiedBangerType = sealTypes.find((s) => s.name === "Certified Banger");
  const hiddenGemType = sealTypes.find((s) => s.name === "Hidden Gem");

  const [certifiedBangerCount, hiddenGemCount] = await Promise.all([
    certifiedBangerType
      ? client.sealAward.count({
          where: { sealTypeId: certifiedBangerType.id, review: { titleId } },
        })
      : 0,
    hiddenGemType
      ? client.sealAward.count({ where: { sealTypeId: hiddenGemType.id, review: { titleId } } })
      : 0,
  ]);

  await client.title.update({
    where: { id: titleId },
    data: { certifiedBangerCount, hiddenGemCount },
  });
}
