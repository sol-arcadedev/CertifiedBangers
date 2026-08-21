import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/settings";
import { recomputeTitleSealCounts } from "@/lib/title-aggregates";

const PROBATION_STREAK_DAYS = 30; // Entry 12

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

    if (netScore >= 0) {
      const positiveStreakDays = award.positiveStreakDays + 1;
      if (positiveStreakDays >= PROBATION_STREAK_DAYS) {
        await prisma.sealAward.update({
          where: { id: award.id },
          data: { positiveStreakDays, status: "PERMANENT", permanentAt: new Date() },
        });
        converted++;
      } else {
        await prisma.sealAward.update({ where: { id: award.id }, data: { positiveStreakDays } });
        extended++;
      }
    } else {
      await prisma.sealAward.update({
        where: { id: award.id },
        data: { positiveStreakDays: 0, lastStreakResetAt: new Date() },
      });
      reset++;
    }
  }

  return { checked: provisional.length, converted, extended, reset };
}
