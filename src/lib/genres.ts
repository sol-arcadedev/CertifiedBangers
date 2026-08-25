import { prisma } from "@/lib/prisma";

// Shared by /titles'/`/reviews`' filter forms and the homepage toolbar —
// both need the same "what genres actually exist in the catalog" list.
// Entry 56: back to a plain local query across every title — the whole
// AniList catalog is mirrored locally now, so this no longer needs an
// AniList API call at all. Entry 60: at 126k+ titles, live `unnest(genres)`
// across every row cost ~6s — no index can speed up "list every distinct
// array element" the way a GIN index speeds up containment checks, so
// caching around the query (Entry 58's unstable_cache attempt) still left
// every cache miss (cold serverless instance, revalidate-window expiry)
// paying the full 6s, which is what made the homepage intermittently slow.
// The distinct-genre list is precomputed by
// scripts/refresh-anilist-catalog.ts (once a day, alongside everything
// else that job already refreshes — genres are a small, AniList-taxonomy-
// bounded set that doesn't need same-day freshness) and stored on the
// PlatformSettings singleton row; this just reads it, an indexed
// single-row lookup regardless of catalog size.
export async function getDistinctGenres(): Promise<string[]> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: { distinctGenres: true },
  });
  return settings?.distinctGenres ?? [];
}
