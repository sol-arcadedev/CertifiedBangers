"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { ReportTargetType } from "@/generated/prisma/enums";
import { checkReportRateLimit } from "@/lib/rate-limit";

export type ReportActionState = { error?: string; message?: string } | undefined;

// Submission side only — the admin queue to actually review/resolve
// reports is WP6.1 (admin moderation panel), not built yet. Reports just
// land as status=OPEN in the meantime.
export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  _prevState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const user = await requireUser();

  const rateLimit = await checkReportRateLimit(user.id);
  if (!rateLimit.allowed) return { error: rateLimit.reason };

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please explain why you're reporting this." };

  if (targetType === "REVIEW") {
    const review = await prisma.review.findUnique({ where: { id: targetId } });
    if (!review) return { error: "Not found." };
    if (review.userId === user.id) return { error: "You can't report your own review." };
  } else if (targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({ where: { id: targetId } });
    if (!comment) return { error: "Not found." };
    if (comment.userId === user.id) return { error: "You can't report your own comment." };
  } else {
    const title = await prisma.title.findUnique({ where: { id: targetId } });
    if (!title) return { error: "Not found." };
  }

  await prisma.report.create({
    data: { reporterUserId: user.id, targetType, targetId, reason },
  });

  return { message: "Reported — a Main Admin will review it." };
}
