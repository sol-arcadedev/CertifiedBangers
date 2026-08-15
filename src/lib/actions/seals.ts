"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { recomputeTitleSealCounts } from "@/lib/title-aggregates";

export type SealActionState = { error?: string } | undefined;

// Phase 1 of the verification workflow (Entry 6): an admin browses
// reviews and directly grants a seal with a justification — there's no
// user-facing "nominate for seal" action at all yet, and no probation:
// admin-granted seals are PERMANENT immediately (Entry 11). Phase 2
// (automatic vote-threshold grants that DO start PROVISIONAL) is WP4.2,
// not built here. Any ADMIN/MAIN_ADMIN can grant — Entry 6 says "an
// admin" generically; this isn't the Main-Admin-specific review-approval
// gate from Entry 28, a different mechanism.
export async function grantSeal(
  reviewId: string,
  sealTypeId: string,
  _prevState: SealActionState,
  formData: FormData,
): Promise<SealActionState> {
  const admin = await requireAdmin();

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.approvalStatus !== "PUBLISHED") {
    return { error: "This review isn't available for seals." };
  }

  const sealType = await prisma.sealType.findUnique({ where: { id: sealTypeId } });
  if (!sealType) return { error: "Seal type not found." };

  const justificationText = String(formData.get("justificationText") ?? "").trim();
  if (!justificationText) return { error: "A justification is required to grant a seal." };

  const existing = await prisma.sealAward.findUnique({
    where: { reviewId_sealTypeId: { reviewId, sealTypeId } },
  });
  if (existing) return { error: `This review already has the ${sealType.name} seal.` };

  await prisma.sealAward.create({
    data: {
      reviewId,
      sealTypeId,
      justificationText,
      grantedVia: "ADMIN",
      grantedByAdminId: admin.id,
      status: "PERMANENT",
      permanentAt: new Date(),
    },
  });

  await recomputeTitleSealCounts(review.titleId);
  revalidatePath(`/titles/${review.titleId}`);
  revalidatePath("/admin/seals");
}

// Entry 13's manual admin override — the escape hatch for a mistaken or
// since-disputed grant. Full demote-to-provisional isn't meaningful yet
// (no probation logic exists to act on it until WP4.2), so this is a
// straightforward removal.
export async function revokeSeal(sealAwardId: string) {
  await requireAdmin();

  const award = await prisma.sealAward.findUnique({
    where: { id: sealAwardId },
    include: { review: { select: { titleId: true } } },
  });
  if (!award) return;

  await prisma.sealAward.delete({ where: { id: sealAwardId } });
  await recomputeTitleSealCounts(award.review.titleId);
  revalidatePath(`/titles/${award.review.titleId}`);
  revalidatePath("/admin/seals");
}
