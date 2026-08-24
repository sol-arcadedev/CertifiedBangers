import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Shared by /titles'/`/reviews`' filter forms and the homepage toolbar —
// both need the same "what genres actually exist in the catalog" list.
// Entry 56: back to a plain local query across every title — the whole
// AniList catalog is mirrored locally now, so this no longer needs an
// AniList API call at all.
export async function getDistinctGenres(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ genre: string }[]>(
    Prisma.sql`SELECT DISTINCT unnest(genres) AS genre FROM titles ORDER BY 1`,
  );
  return rows.map((r) => r.genre);
}
