import { getAniListMediaByIds, type AniListTitleImport } from "@/lib/anilist";

// Shared primitive (Entry 52) for every "list of already-imported titles"
// call site that needs current AniList data — homepage sorts, /reviews'
// genre/Format/Status filters, /titles' minScore filter, the admin titles
// list. Each caller fetches whichever local rows it needs (a bounded set —
// "every title we've imported," never AniList's whole catalog), passes
// them here for one batched live fetch, then applies its own filter/sort
// on top of `.live`.
export async function hydrateWithLiveAniListData<T extends { anilistId: number | null }>(
  rows: T[],
): Promise<(T & { live: AniListTitleImport | null })[]> {
  const ids = rows
    .map((row) => row.anilistId)
    .filter((id): id is number => id !== null);
  const liveById = await getAniListMediaByIds(ids);

  return rows.map((row) => ({
    ...row,
    live: row.anilistId !== null ? (liveById.get(row.anilistId) ?? null) : null,
  }));
}
