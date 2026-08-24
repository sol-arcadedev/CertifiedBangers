import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// PostgreSQL native full-text search (Journal Entry 38) — shared by /titles
// and /reviews' filter bars. Entry 56: searches across every title again
// (not just manual ones) — the whole AniList catalog is mirrored and
// refreshed locally now, so every title has real, current searchable text.
// Computes to_tsvector at query time rather than a persisted/indexed
// generated column + GIN index; fine at this catalog's size (Entry 38 says
// revisit only once that's an actual, demonstrated problem). Returns
// matching ids, filtered by elsewhere alongside every other structured
// filter.
export async function searchTitleIds(query: string): Promise<string[]> {
  // coalesce every operand, not just the scalar text columns: Prisma's
  // typed client silently reads a NULL array column back as [], but raw
  // SQL sees the real NULL — and array_to_string(NULL, ' ') returns NULL,
  // which poisons the whole `||` chain (NULL || anything = NULL), making
  // to_tsvector's input NULL and the row unmatchable by any search term.
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM titles
    WHERE to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce("titleRomaji", '') || ' ' ||
      coalesce("titleEnglish", '') || ' ' ||
      coalesce("titleNative", '') || ' ' ||
      coalesce(author, '') || ' ' ||
      coalesce(array_to_string(genres, ' '), '') || ' ' ||
      coalesce(array_to_string(synonyms, ' '), '')
    ) @@ plainto_tsquery('english', ${query})
  `);
  return rows.map((r) => r.id);
}
