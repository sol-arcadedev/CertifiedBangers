import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { TitleStatus, TitleType } from "@/generated/prisma/enums";
import { LiveSearchInput } from "@/components/live-search-input";
import { TitleCardGrid } from "@/components/title-card-grid";
import { searchAniListMedia, type AniListSearchResult } from "@/lib/anilist";
import { getDistinctGenres } from "@/lib/genres";
import { INPUT, LABEL, BUTTON_PRIMARY } from "@/lib/ui-classes";

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

// Not imported yet, so there's no /titles/[id] for it — links to the
// dedicated AniList preview page instead (src/app/titles/anilist/
// [anilistId]/page.tsx), which mirrors the real title page's layout and
// is where the actual import/write-review action lives.
function AniListResultCard({ result }: { result: AniListSearchResult }) {
  return (
    <Link
      href={`/titles/anilist/${result.anilistId}`}
      className="group overflow-hidden rounded-xl border border-border bg-panel transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/20"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-panel-hover">
        {result.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.coverImageUrl}
            alt={result.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            No cover
          </div>
        )}
        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          AniList
        </span>
      </div>
      <div className="p-2.5">
        <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-accent">
          {result.name}
        </div>
        <div className="mt-1 text-xs text-muted">
          {result.type}
          {result.publicationYear ? ` · ${result.publicationYear}` : ""}
          {result.averageScore !== null ? ` · ${result.averageScore}%` : ""}
        </div>
      </div>
    </Link>
  );
}

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

export default async function TitlesPage(props: PageProps<"/titles">) {
  const searchParams = await props.searchParams;
  const param = (key: string) => (typeof searchParams[key] === "string" ? searchParams[key] : "");

  const q = param("q").trim();
  const genre = param("genre");
  const typeParam = param("type");
  const type = Object.values(TitleType).includes(typeParam as TitleType)
    ? (typeParam as TitleType)
    : "";
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
  if (type) where.type = type;
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

  // On-demand catalog growth: rather than mirroring AniList's whole ~60k+
  // manga database up front (real rate-limit/storage cost for no product
  // benefit — most would sit unreviewed forever), every search still also
  // queries AniList live and shows the results in a separate section —
  // this runs regardless of whether local results exist, since a small
  // local catalog otherwise makes search feel much thinner than AniList's
  // own (e.g. "one" only matching the one locally-seeded "One Piece").
  // Writing a review or adding to library for one of these imports it on
  // the fly for any signed-in user (src/app/titles/anilist/[anilistId]) —
  // title creation isn't gated behind an admin decision anymore.
  let aniListFallback: AniListSearchResult[] = [];
  if (q.length >= 2) {
    try {
      const results = await searchAniListMedia(q);
      const alreadyImported = await prisma.title.findMany({
        where: { anilistId: { in: results.map((r) => r.anilistId) } },
        select: { anilistId: true },
      });
      const importedIds = new Set(alreadyImported.map((t) => t.anilistId));
      aniListFallback = results.filter((r) => !importedIds.has(r.anilistId));
    } catch {
      // AniList being slow/unreachable shouldn't break the browse page —
      // it just falls back to the plain "no titles matching" state.
      aniListFallback = [];
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Titles</h1>

      <form className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-panel p-4" action="/titles">
        <label className={`${LABEL} min-w-[200px] flex-1`}>
          Search
          <LiveSearchInput defaultValue={q} className={INPUT} />
        </label>

        <label className={LABEL}>
          Genre
          <select name="genre" defaultValue={genre} className={INPUT}>
            <option value="">Any</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL}>
          Format
          <select name="type" defaultValue={type} className={INPUT}>
            <option value="">Any</option>
            {Object.values(TitleType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL}>
          Status
          <select name="status" defaultValue={status} className={INPUT}>
            <option value="">Any</option>
            {Object.values(TitleStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL}>
          Sort by
          <select name="sort" defaultValue={sort} className={INPUT}>
            {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
              <option key={key} value={key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL}>
          Min. overall score
          <input
            name="minCommunity"
            type="number"
            min={0}
            max={10}
            step="0.1"
            defaultValue={minCommunityRaw}
            placeholder="0-10"
            className={`w-24 ${INPUT}`}
          />
        </label>

        <label className={LABEL}>
          Min. AniList score
          <input
            name="minScore"
            type="number"
            min={0}
            max={100}
            defaultValue={minScoreRaw}
            placeholder="0-100"
            className={`w-24 ${INPUT}`}
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
          <input type="checkbox" name="hasCB" value="1" defaultChecked={hasCertifiedBanger} />
          🏅 Certified Banger
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
          <input type="checkbox" name="hasHG" value="1" defaultChecked={hasHiddenGem} />
          💎 Hidden Gem
        </label>

        <button type="submit" className={BUTTON_PRIMARY}>
          Apply
        </button>
      </form>

      {titles.length > 0 ? (
        <TitleCardGrid titles={titles} />
      ) : (
        aniListFallback.length === 0 && (
          <p className="py-6 text-sm text-muted">No titles match these filters.</p>
        )
      )}

      {aniListFallback.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-foreground">
            {titles.length > 0 ? "More from AniList" : "Not in our catalog yet"}
          </h2>
          <p className="mt-1 text-sm text-muted">Found on AniList:</p>
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {aniListFallback.map((result) => (
                <AniListResultCard key={result.anilistId} result={result} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
