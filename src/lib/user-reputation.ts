import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Flat award for having a published review on the books at all (one review
// = one award, regardless of edits — editing replaces the same row rather
// than creating a new one, so it can't be farmed by repeatedly resubmitting).
const REVIEW_REPUTATION_POINTS = 2;
// The platform's flagship quality signal — worth far more than writing a
// review in the first place, since it's the community (or an admin)
// vouching for that specific review's quality, not just its existence.
const CERTIFIED_BANGER_REPUTATION_POINTS = 25;
// Casting a vote is worth a flat point regardless of direction — the
// rewarded behavior is engaging with other people's reviews at all, not
// agreeing with them. Capped per calendar day so it rewards genuine daily
// engagement rather than a one-time binge (or two accounts upvoting each
// other in a loop) racking up unlimited reputation.
const VOTE_CAST_REPUTATION_POINTS = 1;
const DAILY_VOTE_REPUTATION_CAP = 10;

// Pure — extracted from recomputeUserReputation (Entry 64) so the
// point-weighting formula is unit-testable without a database.
export function computeReputationScore({
  reviewCount,
  certifiedBangerCount,
  netVotesReceived,
  votesCastByDay,
}: {
  reviewCount: number;
  certifiedBangerCount: number;
  netVotesReceived: number;
  votesCastByDay: number[];
}): number {
  const voteEngagementPoints = votesCastByDay.reduce(
    (sum, count) => sum + Math.min(count, DAILY_VOTE_REPUTATION_CAP),
    0,
  );

  return Math.max(
    0,
    reviewCount * REVIEW_REPUTATION_POINTS +
      certifiedBangerCount * CERTIFIED_BANGER_REPUTATION_POINTS +
      netVotesReceived +
      voteEngagementPoints * VOTE_CAST_REPUTATION_POINTS,
  );
}

// Same precomputed-aggregate pattern as Title's (Entry 39) — recomputed
// from source data on every relevant event (new review, seal granted/
// revoked, review approval status changed, vote cast/switched/undone),
// never accumulated incrementally. Recomputing from scratch each time
// means there's no separate "undo" bookkeeping to get right when a vote is
// switched or deleted — the total is always exactly what the current
// underlying data implies.
export async function recomputeUserReputation(
  userId: string,
  client: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const publishedReviewsWhere = { userId, approvalStatus: "PUBLISHED" as const };

  const [reviewCount, voteTotals, certifiedBangerCount, votesCastByDay] = await Promise.all([
    client.review.count({ where: publishedReviewsWhere }),
    client.review.aggregate({
      where: publishedReviewsWhere,
      _sum: { upvoteCount: true, downvoteCount: true },
    }),
    client.sealAward.count({
      where: { sealType: { name: "Certified Banger" }, review: publishedReviewsWhere },
    }),
    client.$queryRaw<{ day: Date; count: bigint }[]>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS day, count(*) AS count
      FROM votes
      WHERE "userId" = ${userId}
      GROUP BY day
    `),
  ]);

  const netVotesReceived =
    (voteTotals._sum.upvoteCount ?? 0) - (voteTotals._sum.downvoteCount ?? 0);

  const reputationScore = computeReputationScore({
    reviewCount,
    certifiedBangerCount,
    netVotesReceived,
    votesCastByDay: votesCastByDay.map((d) => Number(d.count)),
  });

  await client.user.update({ where: { id: userId }, data: { reputationScore } });
}
