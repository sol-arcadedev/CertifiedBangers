"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin } from "@/lib/require-admin";
import { TitleType } from "@/generated/prisma/enums";

export type ConfigActionState = { error?: string; message?: string } | undefined;

// Categories/seal types are data-driven (Entries 2, 14) so a 6th category
// or a new seal type is a data change, not a deploy — but that data still
// governs how every review's rating scale reads and how the seal system
// brands itself, so it stays Main-Admin-only, same tier as Settings.
export async function createCategory(
  _prevState: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  await requireMainAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const scaleMin = Number(formData.get("scaleMin"));
  const scaleMax = Number(formData.get("scaleMax"));
  if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax) || scaleMin >= scaleMax) {
    return { error: "Scale min/max must be whole numbers with min < max." };
  }

  const appliesToType = formData.getAll("appliesToType") as string[];
  const validTypes = appliesToType.filter((t): t is TitleType =>
    Object.values(TitleType).includes(t as TitleType),
  );
  if (validTypes.length === 0) return { error: "Select at least one title type." };

  await prisma.category.create({
    data: { name, scaleMin, scaleMax, appliesToType: validTypes },
  });

  revalidatePath("/admin/config");
  return { message: "Category created." };
}

export async function updateCategory(
  id: string,
  _prevState: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  await requireMainAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const scaleMin = Number(formData.get("scaleMin"));
  const scaleMax = Number(formData.get("scaleMax"));
  if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax) || scaleMin >= scaleMax) {
    return { error: "Scale min/max must be whole numbers with min < max." };
  }

  const appliesToType = formData.getAll("appliesToType") as string[];
  const validTypes = appliesToType.filter((t): t is TitleType =>
    Object.values(TitleType).includes(t as TitleType),
  );
  if (validTypes.length === 0) return { error: "Select at least one title type." };

  await prisma.category.update({
    where: { id },
    data: { name, scaleMin, scaleMax, appliesToType: validTypes },
  });

  revalidatePath("/admin/config");
  return { message: "Category updated." };
}

export async function createSealType(
  _prevState: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  await requireMainAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const icon = String(formData.get("icon") ?? "").trim() || null;

  await prisma.sealType.create({ data: { name, description, icon } });

  revalidatePath("/admin/config");
  return { message: "Seal type created." };
}

const LOCKED_SEAL_TYPE_NAMES = ["Certified Banger"];

export async function updateSealType(
  id: string,
  _prevState: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  await requireMainAdmin();

  const existing = await prisma.sealType.findUnique({ where: { id } });
  if (!existing) return { error: "Seal type not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  // recomputeTitleSealCounts (title-aggregates.ts) and checkAutoSealCandidacy
  // (seal-probation.ts) both match this seal type by its exact name string —
  // renaming it would silently break seal-count aggregation and Phase 2
  // auto-candidacy, so the v1 seal type's name is locked.
  if (LOCKED_SEAL_TYPE_NAMES.includes(existing.name) && name !== existing.name) {
    return { error: `"${existing.name}" can't be renamed — the seal system matches on this exact name.` };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const icon = String(formData.get("icon") ?? "").trim() || null;

  await prisma.sealType.update({ where: { id }, data: { name, description, icon } });

  revalidatePath("/admin/config");
  return { message: "Seal type updated." };
}
