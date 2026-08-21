import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Separate bucket from COVER_BUCKET (src/lib/cover-storage.ts) — title
// covers and user-uploaded profile images are conceptually different
// content, so they get their own bucket rather than sharing one named
// "covers". Avatars and banners share this one bucket, split by path
// prefix, since both are the same kind of thing (a profile-owner-uploaded
// public image) differing only in where they're displayed.
export const PROFILE_IMAGE_BUCKET = "profile-images";
const PROFILE_IMAGE_URL_MARKER = `/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/`;

export async function uploadProfileImage(
  kind: "avatars" | "banners",
  buffer: Buffer,
  contentType: string,
  ext: string,
): Promise<string> {
  const admin = createAdminClient();
  const path = `${kind}/${randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).upload(path, buffer, {
    contentType,
  });
  if (error) {
    throw new Error(`${kind === "avatars" ? "Avatar" : "Banner"} upload failed: ${error.message}`);
  }

  return admin.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteProfileImageIfOwned(url: string | null) {
  if (!url?.includes(PROFILE_IMAGE_URL_MARKER)) return;
  const path = url.split(PROFILE_IMAGE_URL_MARKER)[1];
  await createAdminClient().storage.from(PROFILE_IMAGE_BUCKET).remove([path]);
}
