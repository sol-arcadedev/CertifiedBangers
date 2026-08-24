import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// PostgreSQL native full-text search (Journal Entry 38) — shared by /titles
// and /reviews' filter bars. Entry 56: searches across every title again
// (not just manual ones) — the whole AniList catalog is mirrored and
// refreshed locally now, so every title has real, current searchable text.
// Entry 58: at 100k+ mirrored titles, computing to_tsvector at query time
// on every row stopped being free — "searchVector" is now a persisted
// column (kept in sync by a BEFORE INSERT/UPDATE trigger, not a
// GENERATED ALWAYS AS column — to_tsvector() isn't IMMUTABLE, which
// Postgres requires for generated columns) with a GIN index, added via
// scripts/add-search-index.ts. Returns matching ids, filtered by
// elsewhere alongside every other structured filter.
export async function searchTitleIds(query: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM titles
    WHERE "searchVector" @@ plainto_tsquery('english', ${query})
  `);
  return rows.map((r) => r.id);
}
