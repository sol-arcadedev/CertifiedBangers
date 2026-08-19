import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Shared by /titles' filter form and the homepage toolbar — both need the
// same "what genres actually exist in the catalog" list.
export async function getDistinctGenres(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ genre: string }[]>(
    Prisma.sql`SELECT DISTINCT unnest(genres) AS genre FROM titles ORDER BY 1`,
  );
  return rows.map((r) => r.genre);
}
