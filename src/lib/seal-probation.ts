import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/settings";
import { maybeSetDiscoveredBy, recomputeTitleSealCounts } from "@/lib/title-aggregates";
import { recomputeUserReputation } from "@/lib/user-reputation";

const PROBATION_STREAK_DAYS = 30; // Entry 12

// Pure — extracted from runSealProbationCheck's loop body (Entry 64) so the
// streak state-transition rules (extend / convert at 30 days / reset on any
// dip) are unit-testable without a database or real clock.
export function computeNextStreakState(
  currentStreakDays: number,
  netScore: number,
  now: Date,
): {
  positiveStreakDays: number;
  status: "PROVISIONAL" | "PERMANENT";
  permanentAt: Date | null;
  lastStreakResetAt: Date | null;
} {
  if (netScore >= 0) {
    const positiveStreakDays = currentStreakDays + 1;
    if (positiveStreakDays >= PROBATION_STREAK_DAYS) {
      return { positiveStreakDays, status: "PERMANENT", permanentAt: now, lastStreakResetAt: null };
    }
    return { positiveStreakDays, status: "PROVISIONAL", permanentAt: null, lastStreakResetAt: null };
  }
  return { positiveStreakDays: 0, status: "PROVISIONAL", permanentAt: null, lastStreakResetAt: now };
}

async function grantAutoSeal(reviewId: string, sealTypeId: string, justificationText: string) {
  await prisma.sealAward.create({
    data: {
      reviewId,
      sealTypeId,
      justificationText,
      grantedVia: "VOTE_THRESHOLD",
      status: "PROVISIONAL",
      positiveStreakDays: 0,
      lastStreakResetAt: new Date(),
    },
  });
}

// Called after every vote (src/lib/actions/votes.ts). Phase 2 candidacy —
// no admin/justification involved, hence the auto-generated justification
// text, which the required-String justificationText column still needs
// something in.
//
// Entry 45: the popularity-gated Hidden Gem seal was removed — crossing the
// quality gate now earns Certified Banger directly, regardless of the
// title's popularity.
export async function checkAutoSealCandidacy(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.approvalStatus !== "PUBLISHED") return;

  const netScore = review.upvoteCount - review.downvoteCount;
  const settings = await getPlatformSettings();
  if (netScore < settings.sealQualityGateThreshold) return;

  const certifiedBanger = await prisma.sealType.findUnique({ where: { name: "Certified Banger" } });
  if (!certifiedBanger) return;

  const existingCB = await prisma.sealAward.findUnique({
    where: { reviewId_sealTypeId: { reviewId, sealTypeId: certifiedBanger.id } },
  });
  if (existingCB) return;

  await grantAutoSeal(
    reviewId,
    certifiedBanger.id,
    `Automatically certified as Certified Banger: net vote score +${netScore} (threshold +${settings.sealQualityGateThreshold}).`,
  );

  await recomputeTitleSealCounts(review.titleId);
  await maybeSetDiscoveredBy(review.titleId, review.userId);
  await recomputeUserReputation(review.userId);
}

// Daily cron job (src/app/api/cron/seal-probation/route.ts). Entry 12:
// evaluated continuously — non-negative net score today extends the
// streak (converting to PERMANENT at 30 consecutive days), any dip
// resets it to zero. No hard revocation state: a review that fails
// simply stays PROVISIONAL indefinitely and keeps being checked.
// Entry 11: only Phase 2 (VOTE_THRESHOLD) seals go through probation —
// Phase 1 (ADMIN) grants are never PROVISIONAL in the first place.
export async function runSealProbationCheck() {
  const provisional = await prisma.sealAward.findMany({
    where: { status: "PROVISIONAL", grantedVia: "VOTE_THRESHOLD" },
    include: { review: { select: { upvoteCount: true, downvoteCount: true } } },
  });

  let converted = 0;
  let extended = 0;
  let reset = 0;

  for (const award of provisional) {
    const netScore = award.review.upvoteCount - award.review.downvoteCount;
    const next = computeNextStreakState(award.positiveStreakDays, netScore, new Date());

    if (next.status === "PERMANENT") {
      await prisma.sealAward.update({
        where: { id: award.id },
        data: {
          positiveStreakDays: next.positiveStreakDays,
          status: "PERMANENT",
          permanentAt: next.permanentAt!,
        },
      });
      converted++;
    } else if (next.lastStreakResetAt) {
      await prisma.sealAward.update({
        where: { id: award.id },
        data: { positiveStreakDays: next.positiveStreakDays, lastStreakResetAt: next.lastStreakResetAt },
      });
      reset++;
    } else {
      await prisma.sealAward.update({
        where: { id: award.id },
        data: { positiveStreakDays: next.positiveStreakDays },
      });
      extended++;
    }
  }

  return { checked: provisional.length, converted, extended, reset };
}
