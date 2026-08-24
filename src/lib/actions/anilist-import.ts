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

  // Entry 56: back to storing AniList's metadata locally as the source of
  // truth — the whole catalog is mirrored and refreshed daily
  // (scripts/mirror-anilist-catalog.ts, scripts/refresh-anilist-catalog.ts)
  // now, rather than Entry 52's per-render live-fetch, so a local copy is
  // trustworthy again (refreshed at most ~24h stale, not stale forever).
  const title = await prisma.title.create({
    data: {
      anilistId: media.anilistId,
      name: media.name,
      titleRomaji: media.titleRomaji,
      titleEnglish: media.titleEnglish,
      titleNative: media.titleNative,
      synonyms: media.synonyms,
      type: media.type,
      status: media.status,
      author: media.author,
      illustrator: media.illustrator,
      genres: media.genres,
      synopsis: media.synopsis,
      publicationYear: media.publicationYear,
      startMonth: media.startMonth,
      startDay: media.startDay,
      externalLinks: media.externalLinks,
      coverUrl,
      anilistAverageScore: media.averageScore,
      anilistMeanScore: media.meanScore,
      anilistPopularity: media.popularity,
      anilistFavourites: media.favourites,
      anilistSource: media.source,
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
