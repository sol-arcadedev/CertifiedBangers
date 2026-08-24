import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Shared by /titles'/`/reviews`' filter forms and the homepage toolbar —
// both need the same "what genres actually exist in the catalog" list.
// Entry 56: back to a plain local query across every title — the whole
// AniList catalog is mirrored locally now, so this no longer needs an
// AniList API call at all. Entry 58: at 100k+ titles, `unnest(genres)`
// across every row on every request cost ~6s — genres change slowly (a
// wholly new AniList genre is rare), so this is cached for an hour via
// unstable_cache (persists across Vercel's serverless invocations, unlike
// per-request memoization; the `use cache` directive would need flipping
// on the project-wide `cacheComponents` config flag, a bigger change than
// this warrants).
export const getDistinctGenres = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.$queryRaw<{ genre: string }[]>(
      Prisma.sql`SELECT DISTINCT unnest(genres) AS genre FROM titles ORDER BY 1`,
    );
    return rows.map((r) => r.genre);
  },
  ["distinct-genres"],
  { revalidate: 3600 },
);
