"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { uploadProfileImage, deleteProfileImageIfOwned } from "@/lib/profile-image-storage";

export type ProfileImageActionState = { error?: string } | undefined;

async function uploadImage(kind: "avatars" | "banners", file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadProfileImage(kind, buffer, file.type || "image/jpeg", ext);
}

// One form, one action — updates whichever of avatar/banner was actually
// submitted with a file, so a user isn't forced to re-upload both just to
// change one. Re-uploads to this app's own Storage rather than accepting a
// URL, same reasoning as title covers (Entry 35/44): never hot-link
// arbitrary external images.
export async function updateProfileImages(
  _prevState: ProfileImageActionState,
  formData: FormData,
): Promise<ProfileImageActionState> {
  const user = await requireUser();

  const avatar = formData.get("avatar");
  const banner = formData.get("banner");
  const data: { avatarUrl?: string; bannerUrl?: string } = {};

  try {
    if (avatar instanceof File && avatar.size > 0) {
      data.avatarUrl = await uploadImage("avatars", avatar);
    }
    if (banner instanceof File && banner.size > 0) {
      data.bannerUrl = await uploadImage("banners", banner);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  if (Object.keys(data).length === 0) {
    return { error: "Choose an image to upload." };
  }

  if (data.avatarUrl) await deleteProfileImageIfOwned(user.avatarUrl);
  if (data.bannerUrl) await deleteProfileImageIfOwned(user.bannerUrl);

  await prisma.user.update({ where: { id: user.id }, data });
  revalidatePath(`/profile/${user.username}`);
}
