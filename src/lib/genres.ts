import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getAniListGenreCollection } from "@/lib/anilist";

// Shared by /titles'/`/reviews`' filter forms and the homepage toolbar —
// all need the same "what genres exist to filter by" list. AniList's own
// canonical genre list (Entry 52) covers every AniList-linked title, since
// genres are no longer stored locally for those; unioned with whatever
// genres exist on local manual titles (the only rows where genres are
// still locally stored) so a manual title's genre is always selectable
// too, even if AniList's list doesn't happen to include it verbatim.
export async function getDistinctGenres(): Promise<string[]> {
  const [aniListGenres, manualGenreRows] = await Promise.all([
    getAniListGenreCollection().catch(() => []),
    prisma.$queryRaw<{ genre: string }[]>(
      Prisma.sql`SELECT DISTINCT unnest(genres) AS genre FROM titles WHERE "anilistId" IS NULL`,
    ),
  ]);

  return [...new Set([...aniListGenres, ...manualGenreRows.map((r) => r.genre)])].sort();
}
