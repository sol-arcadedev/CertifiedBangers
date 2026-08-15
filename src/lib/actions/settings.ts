"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin } from "@/lib/require-admin";

export type SettingsActionState = { error?: string; message?: string } | undefined;

export async function updateSettings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireMainAdmin();

  const minAccountAgeDays = Number(formData.get("minAccountAgeDays"));
  if (!Number.isInteger(minAccountAgeDays) || minAccountAgeDays < 0) {
    return { error: "Minimum account age must be a whole number of days, 0 or more." };
  }

  const sealQualityGateThreshold = Number(formData.get("sealQualityGateThreshold"));
  if (!Number.isInteger(sealQualityGateThreshold) || sealQualityGateThreshold < 1) {
    return { error: "Seal quality-gate threshold must be a whole number, at least 1." };
  }

  const sealPopularityGateThreshold = Number(formData.get("sealPopularityGateThreshold"));
  if (!Number.isInteger(sealPopularityGateThreshold) || sealPopularityGateThreshold < 1) {
    return { error: "Seal popularity-gate threshold must be a whole number, at least 1." };
  }

  const rateLimitFields = [
    "reviewRateLimitPerHour",
    "commentRateLimitPerHour",
    "voteRateLimitPerHour",
    "reportRateLimitPerHour",
  ] as const;
  const rateLimits: Record<(typeof rateLimitFields)[number], number> = {
    reviewRateLimitPerHour: 0,
    commentRateLimitPerHour: 0,
    voteRateLimitPerHour: 0,
    reportRateLimitPerHour: 0,
  };
  for (const field of rateLimitFields) {
    const value = Number(formData.get(field));
    if (!Number.isInteger(value) || value < 1) {
      return { error: "Rate limits must be whole numbers, at least 1 per hour." };
    }
    rateLimits[field] = value;
  }

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { minAccountAgeDays, sealQualityGateThreshold, sealPopularityGateThreshold, ...rateLimits },
    create: {
      id: "singleton",
      minAccountAgeDays,
      sealQualityGateThreshold,
      sealPopularityGateThreshold,
      ...rateLimits,
    },
  });

  revalidatePath("/admin/settings");
  return { message: "Saved." };
}
