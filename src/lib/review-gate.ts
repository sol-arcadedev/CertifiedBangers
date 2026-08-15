import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getPlatformSettings } from "@/lib/settings";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewGateResult = { allowed: true } | { allowed: false; reason: string };

// The baseline gate (Journal Entry 40) only applies to a user's platform-wide
// first review ever — not every review, and not per-title (that's
// isFirstReviewOfTitle, a separate concept handled in submitReview).
// Email verification is mandatory and not configurable; the minimum account
// age is admin-configurable via PlatformSettings.
export async function checkReviewGate(
  userId: string,
  accountCreatedAt: Date,
): Promise<ReviewGateResult> {
  const isFirstEver = (await prisma.review.count({ where: { userId } })) === 0;
  if (!isFirstEver) return { allowed: true };

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email_confirmed_at) {
    return { allowed: false, reason: "Verify your email before posting your first review." };
  }

  const { minAccountAgeDays } = await getPlatformSettings();
  const accountAgeMs = Date.now() - accountCreatedAt.getTime();
  const minAgeMs = minAccountAgeDays * DAY_MS;

  if (accountAgeMs < minAgeMs) {
    const daysLeft = Math.ceil((minAgeMs - accountAgeMs) / DAY_MS);
    return {
      allowed: false,
      reason: `Your account needs to be at least ${minAccountAgeDays} day(s) old before your first review — try again in ${daysLeft} day(s).`,
    };
  }

  return { allowed: true };
}
