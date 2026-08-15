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
// Entry 15's popularity gate: crossing the quality gate earns Hidden Gem
// if the TITLE's popularity (total votes on its highest-voted review, not
// this review specifically) is below the popularity threshold, or
// Certified Banger if at/above it. Earning Certified Banger is additive —
// it does NOT remove an already-held Hidden Gem (rule 3/4) — so this only
// skips entirely once the review holds Certified Banger itself; an
// existing Hidden Gem doesn't block a later Certified Banger upgrade.
export async function checkAutoSealCandidacy(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.approvalStatus !== "PUBLISHED") return;

  const netScore = review.upvoteCount - review.downvoteCount;
  const settings = await getPlatformSettings();
  if (netScore < settings.sealQualityGateThreshold) return;

  const [certifiedBanger, hiddenGem] = await Promise.all([
    prisma.sealType.findUnique({ where: { name: "Certified Banger" } }),
    prisma.sealType.findUnique({ where: { name: "Hidden Gem" } }),
  ]);
  if (!certifiedBanger || !hiddenGem) return;

  const existingCB = await prisma.sealAward.findUnique({
    where: { reviewId_sealTypeId: { reviewId, sealTypeId: certifiedBanger.id } },
  });
  if (existingCB) return;

  const titleReviews = await prisma.review.findMany({
    where: { titleId: review.titleId, approvalStatus: "PUBLISHED" },
    select: { upvoteCount: true, downvoteCount: true },
  });
  const popularity = Math.max(0, ...titleReviews.map((r) => r.upvoteCount + r.downvoteCount));

  if (popularity >= settings.sealPopularityGateThreshold) {
    await grantAutoSeal(
      reviewId,
      certifiedBanger.id,
      `Automatically certified as Certified Banger: net vote score +${netScore} (threshold +${settings.sealQualityGateThreshold}), and the title's most-voted review has ${popularity} total votes (popularity threshold ${settings.sealPopularityGateThreshold}).`,
    );
  } else {
    const existingHG = await prisma.sealAward.findUnique({
      where: { reviewId_sealTypeId: { reviewId, sealTypeId: hiddenGem.id } },
    });
    if (!existingHG) {
      await grantAutoSeal(
        reviewId,
        hiddenGem.id,
        `Automatically certified as Hidden Gem: net vote score +${netScore} (threshold +${settings.sealQualityGateThreshold}), and the title's most-voted review has only ${popularity} total votes (below the ${settings.sealPopularityGateThreshold}-vote popularity threshold for Certified Banger).`,
      );
    }
  }

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
