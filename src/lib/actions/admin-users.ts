"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin } from "@/lib/require-admin";

// Entry 41: lifting the review-approval requirement for a given admin is a
// manual, case-by-case Main Admin judgment call — no automatic rule. This
// is the only place that toggle is reachable from.
export async function setAdminTrust(userId: string, requireApproval: boolean) {
  await requireMainAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { adminReviewsRequireApproval: requireApproval },
  });
  revalidatePath("/admin/admins");
}
