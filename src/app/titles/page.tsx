import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { TitleStatus } from "@/generated/prisma/enums";

const SORT_OPTIONS = {
  name: { label: "Name", orderBy: { name: "asc" } },
  score: { label: "AniList score", orderBy: { anilistAverageScore: { sort: "desc", nulls: "last" } } },
  popularity: {
    label: "AniList popularity",
    orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } },
  },
  community: {
    label: "Highest overall score",
    orderBy: { communityScore: { sort: "desc", nulls: "last" } },
  },
  seals: { label: "Most seals", orderBy: { totalSealCount: "desc" } },
  recent: {
    label: "Most recent reviews",
    orderBy: { lastReviewedAt: { sort: "desc", nulls: "last" } },
  },
  discussed: { label: "Most discussed", orderBy: { discussionCount: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.TitleOrderByWithRelationInput }>;

type SortKey = keyof typeof SORT_OPTIONS;

// PostgreSQL native full-text search (Journal Entry 38 — not a dedicated
// search service). Computes to_tsvector at query time rather than a
// persisted/indexed generated column + GIN index; at the catalog sizes
// this platform will see for a good while, a plain scan is fine, and
// Entry 38 itself says to revisit only once that's an actual, demonstrated
// problem. Returns matching ids, which the caller then filters by
// alongside every other structured filter.
async function searchTitleIds(query: string): Promise<string[]> {
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

async function getDistinctGenres(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ genre: string }[]>(
    Prisma.sql`SELECT DISTINCT unnest(genres) AS genre FROM titles ORDER BY 1`,
  );
  return rows.map((r) => r.genre);
}

export default async function TitlesPage(props: PageProps<"/titles">) {
  const searchParams = await props.searchParams;
  const param = (key: string) => (typeof searchParams[key] === "string" ? searchParams[key] : "");

  const q = param("q").trim();
  const genre = param("genre");
  const statusParam = param("status");
  const status = Object.values(TitleStatus).includes(statusParam as TitleStatus)
    ? (statusParam as TitleStatus)
    : "";
  const hasCertifiedBanger = param("hasCB") === "1";
  const hasHiddenGem = param("hasHG") === "1";
  const minScoreRaw = param("minScore");
  const minCommunityRaw = param("minCommunity");
  const sortParam = param("sort") || "name";
  const sort: SortKey = sortParam in SORT_OPTIONS ? (sortParam as SortKey) : "name";

  const [matchingIds, genres] = await Promise.all([
    q.length >= 2 ? searchTitleIds(q) : null,
    getDistinctGenres(),
  ]);

  const where: Prisma.TitleWhereInput = {};
  if (matchingIds) where.id = { in: matchingIds };
  if (genre) where.genres = { has: genre };
  if (status) where.status = status;
  if (hasCertifiedBanger) where.certifiedBangerCount = { gt: 0 };
  if (hasHiddenGem) where.hiddenGemCount = { gt: 0 };
  if (minScoreRaw && !Number.isNaN(Number(minScoreRaw))) {
    where.anilistAverageScore = { gte: Number(minScoreRaw) };
  }
  if (minCommunityRaw && !Number.isNaN(Number(minCommunityRaw))) {
    where.communityScore = { gte: Number(minCommunityRaw) };
  }

  const titles = await prisma.title.findMany({
    where,
    orderBy: SORT_OPTIONS[sort].orderBy,
    take: 100,
  });

  const inputClass =
    "rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50";
  const labelClass = "flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">Titles</h1>

      <form className="mb-6 flex flex-wrap items-end gap-4" action="/titles">
        <label className={`${labelClass} min-w-[200px] flex-1`}>
          Search
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, genre, author…"
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Genre
          <select name="genre" defaultValue={genre} className={inputClass}>
            <option value="">Any</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Status
          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">Any</option>
            {Object.values(TitleStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Sort by
          <select name="sort" defaultValue={sort} className={inputClass}>
            {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
              <option key={key} value={key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Min. overall score
          <input
            name="minCommunity"
            type="number"
            min={0}
            max={10}
            step="0.1"
            defaultValue={minCommunityRaw}
            placeholder="0-10"
            className={`w-24 ${inputClass}`}
          />
        </label>

        <label className={labelClass}>
          Min. AniList score
          <input
            name="minScore"
            type="number"
            min={0}
            max={100}
            defaultValue={minScoreRaw}
            placeholder="0-100"
            className={`w-24 ${inputClass}`}
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="hasCB" value="1" defaultChecked={hasCertifiedBanger} />
          🏅 Certified Banger
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="hasHG" value="1" defaultChecked={hasHiddenGem} />
          💎 Hidden Gem
        </label>

        <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm text-background">
          Apply
        </button>
      </form>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {titles.map((title) => (
          <li key={title.id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {title.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={title.coverUrl}
                  alt={title.name}
                  className="h-16 w-11 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-16 w-11 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
              )}
              <div className="min-w-0">
                <Link
                  href={`/titles/${title.id}`}
                  className="block truncate font-medium text-black dark:text-zinc-50"
                >
                  {title.name}
                  {(title.certifiedBangerCount > 0 || title.hiddenGemCount > 0) && (
                    <span
                      className="ml-1"
                      aria-label={[
                        title.certifiedBangerCount > 0 && "Certified Banger",
                        title.hiddenGemCount > 0 && "Hidden Gem",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    >
                      {title.certifiedBangerCount > 0 && <span aria-hidden="true">🏅</span>}
                      {title.hiddenGemCount > 0 && <span aria-hidden="true">💎</span>}
                    </span>
                  )}
                </Link>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {title.type} · {title.status}
                  {title.reviewCount > 0 ? ` · ${title.reviewCount} reviews` : ""}
                </div>
                {title.communityScore !== null && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    CertifiedBanger rating: {title.communityScore}
                  </div>
                )}
              </div>
            </div>
            {(title.anilistAverageScore !== null || title.anilistPopularity !== null) && (
              <div className="shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
                {title.anilistAverageScore !== null && (
                  <div>AniList {title.anilistAverageScore}/100</div>
                )}
                {title.anilistPopularity !== null && (
                  <div>{title.anilistPopularity.toLocaleString()} on AniList lists</div>
                )}
              </div>
            )}
          </li>
        ))}
        {titles.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No titles match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
