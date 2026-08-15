import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const COVER_BUCKET = "covers";
const COVER_URL_MARKER = `/storage/v1/object/public/${COVER_BUCKET}/`;

// Shared by the manual title form (uploads a browser File) and the AniList
// import flow (downloads AniList's cover and re-uploads it here, rather
// than hot-linking their CDN — Entry 44/35).
export async function uploadCoverBuffer(
  buffer: Buffer,
  contentType: string,
  ext: string,
): Promise<string> {
  const admin = createAdminClient();
  const path = `${randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(COVER_BUCKET).upload(path, buffer, {
    contentType,
  });
  if (error) throw new Error(`Cover upload failed: ${error.message}`);

  return admin.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteCoverIfOwned(coverUrl: string | null) {
  if (!coverUrl?.includes(COVER_URL_MARKER)) return;
  const path = coverUrl.split(COVER_URL_MARKER)[1];
  await createAdminClient().storage.from(COVER_BUCKET).remove([path]);
}
