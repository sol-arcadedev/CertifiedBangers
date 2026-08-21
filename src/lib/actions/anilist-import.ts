"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { uploadCoverBuffer } from "@/lib/cover-storage";
import { searchAniListMedia, getAniListMediaById } from "@/lib/anilist";

export type AniListSearchState = { error?: string } | undefined;

// Primary title-creation path (Entry 44). Annotates each AniList result
// with whether it's already in our catalog, so the admin doesn't
// accidentally re-import (the anilistId unique constraint would reject it
// anyway, but surfacing it up front is better UX).
export async function searchAniList(query: string) {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];

  const results = await searchAniListMedia(q);
  if (results.length === 0) return [];

  const existing = await prisma.title.findMany({
    where: { anilistId: { in: results.map((r) => r.anilistId) } },
    select: { id: true, anilistId: true },
  });
  const existingByAnilistId = new Map(existing.map((t) => [t.anilistId, t.id]));

  return results.map((r) => ({
    ...r,
    existingTitleId: existingByAnilistId.get(r.anilistId) ?? null,
  }));
}

async function downloadCover(url: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download cover image (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = url.split(".").pop()?.split(/[?#]/)[0]?.toLowerCase() || "jpg";
  return { buffer, contentType, ext };
}

// The actual import mechanics (find-or-create), with no gate of its own —
// each caller applies whatever gate fits its context: requireAdmin() for
// the two wrappers below, or requireUser() + the review gate/rate limit
// for src/lib/actions/reviews.ts's submitReviewForAniListTitle (writing a
// genuine review is itself the appropriate bar for "this title is worth
// adding to the catalog," not an admin's separate say-so).
export async function performAniListImport(
  anilistId: number,
): Promise<{ error: string } | { titleId: string }> {
  const existing = await prisma.title.findUnique({ where: { anilistId } });
  if (existing) return { titleId: existing.id };

  const media = await getAniListMediaById(anilistId);
  if (!media) return { error: "That title could not be found on AniList." };

  let coverUrl: string | null = null;
  if (media.coverImageUrl) {
    try {
      const { buffer, contentType, ext } = await downloadCover(media.coverImageUrl);
      coverUrl = await uploadCoverBuffer(buffer, contentType, ext);
    } catch {
      // Import still proceeds without a cover — the admin can upload one
      // manually on the edit page rather than losing the whole import.
      coverUrl = null;
    }
  }

  // Entry 52: this platform no longer trusts a local copy of AniList's
  // metadata as the source of truth — every display path live-fetches by
  // anilistId instead, so it never goes stale the way it used to. Three
  // fields still get written here regardless: `type` (a deliberate
  // exception — read synchronously on the review/library write paths for
  // Category matching, and a title's country-of-origin never changes, so
  // it isn't "stale" the way status/scores are), and `name`/`status` (kept
  // as a graceful-degrade fallback for when AniList is slow/unreachable at
  // render time — a possibly-slightly-stale real name/status beats a
  // generic placeholder). Everything else AniList provides is fetched live
  // on every render and never stored.
  const title = await prisma.title.create({
    data: {
      anilistId: media.anilistId,
      name: media.name,
      type: media.type,
      status: media.status,
      coverUrl,
    },
  });

  return { titleId: title.id };
}

export async function importAniListTitle(anilistId: number): Promise<{ error: string } | never> {
  await requireAdmin();

  const result = await performAniListImport(anilistId);
  if ("error" in result) return result;

  revalidatePath("/admin/titles");
  redirect(`/admin/titles/${result.titleId}`);
}
