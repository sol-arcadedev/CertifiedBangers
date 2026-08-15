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

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { minAccountAgeDays, sealQualityGateThreshold },
    create: { id: "singleton", minAccountAgeDays, sealQualityGateThreshold },
  });

  revalidatePath("/admin/settings");
  return { message: "Saved." };
}
