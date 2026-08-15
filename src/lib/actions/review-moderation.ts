"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin } from "@/lib/require-admin";
import { recomputeTitleAggregates } from "@/lib/title-aggregates";

// Only the Main Admin approves/rejects — Entry 28: non-Main-Admin admin
// reviews are gated behind the Main Admin's own approval, so it wouldn't
// make sense for another admin to approve their own or a peer's review.
export async function approveReview(id: string) {
  await requireMainAdmin();
  const review = await prisma.review.update({
    where: { id },
    data: { approvalStatus: "PUBLISHED" },
  });
  await recomputeTitleAggregates(review.titleId);
  revalidatePath("/admin/reviews");
  revalidatePath(`/titles/${review.titleId}`);
}

export async function rejectReview(id: string) {
  await requireMainAdmin();
  const review = await prisma.review.update({
    where: { id },
    data: { approvalStatus: "REJECTED" },
  });
  await recomputeTitleAggregates(review.titleId);
  revalidatePath("/admin/reviews");
  revalidatePath(`/titles/${review.titleId}`);
}
