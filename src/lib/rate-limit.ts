import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/settings";

const HOUR_MS = 60 * 60 * 1000;

function hourAgo() {
  return new Date(Date.now() - HOUR_MS);
}

export type RateLimitResult = { allowed: true } | { allowed: false; reason: string };

function overLimit(count: number, limit: number, what: string): RateLimitResult {
  if (count >= limit) {
    return {
      allowed: false,
      reason: `You've hit the limit of ${limit} ${what} per hour — try again later.`,
    };
  }
  return { allowed: true };
}

// Counts new submissions only, not edits of an existing review (edit-replace
// via the userId+titleId unique constraint doesn't grow content volume).
export async function checkReviewRateLimit(userId: string): Promise<RateLimitResult> {
  const { reviewRateLimitPerHour } = await getPlatformSettings();
  const count = await prisma.review.count({ where: { userId, createdAt: { gte: hourAgo() } } });
  return overLimit(count, reviewRateLimitPerHour, "new reviews");
}

export async function checkCommentRateLimit(userId: string): Promise<RateLimitResult> {
  const { commentRateLimitPerHour } = await getPlatformSettings();
  const count = await prisma.comment.count({ where: { userId, createdAt: { gte: hourAgo() } } });
  return overLimit(count, commentRateLimitPerHour, "comments");
}

// Counts new Vote rows only — toggling a vote off (delete) or switching it
// (update) isn't gated, since undoing/changing your own vote shouldn't burn
// the same budget as casting a first-time vote.
export async function checkVoteRateLimit(userId: string): Promise<RateLimitResult> {
  const { voteRateLimitPerHour } = await getPlatformSettings();
  const count = await prisma.vote.count({ where: { userId, createdAt: { gte: hourAgo() } } });
  return overLimit(count, voteRateLimitPerHour, "votes");
}

export async function checkReportRateLimit(userId: string): Promise<RateLimitResult> {
  const { reportRateLimitPerHour } = await getPlatformSettings();
  const count = await prisma.report.count({
    where: { reporterUserId: userId, createdAt: { gte: hourAgo() } },
  });
  return overLimit(count, reportRateLimitPerHour, "reports");
}
