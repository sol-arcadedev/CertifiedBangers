import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { TitleStatus, TitleType } from "@/generated/prisma/enums";
import { LiveSearchInput } from "@/components/live-search-input";
import { TitleCardGrid } from "@/components/title-card-grid";
import { browseAniListMedia } from "@/lib/anilist";
import { getDistinctGenres } from "@/lib/genres";
import { searchTitleIds } from "@/lib/title-search";
import { INPUT, LABEL, BUTTON_PRIMARY } from "@/lib/ui-classes";

// Sorting happens in JS on the merged local+AniList array (compareCards,
// below), not at the DB level — a plain label list is all this needs now.
const SORT_OPTIONS = {
  name: { label: "Name" },
  score: { label: "AniList score" },
  popularity: { label: "AniList popularity" },
  community: { label: "Highest overall score" },
  seals: { label: "Most seals" },
  recent: { label: "Most recent reviews" },
  discussed: { label: "Most discussed" },
} satisfies Record<string, { label: string }>;

type SortKey = keyof typeof SORT_OPTIONS;

// One unified shape for both "already in our catalog" and "AniList-only"
// results, so they render in a single grid indistinguishable from each
// other — no more "our stuff" vs "AniList's stuff" split. AniList-only
// entries just carry zero/null for every locally-computed field, which
// naturally sorts them after anything with real review/seal/discussion
// data without needing special-case logic.
type UnifiedCard = {
  id: string;
  href?: string;
  name: string;
  type: string;
  coverUrl: string | null;
  anilistAverageScore: number | null;
  anilistPopularity: number | null;
  communityScore: number | null;
  lastReviewedAt: Date | null;
  discussionCount: number;
  reviewCount: number;
  certifiedBangerCount: number;
};

function compareCards(a: UnifiedCard, b: UnifiedCard, sort: SortKey): number {
  switch (sort) {
    case "name":
      return a.name.localeCompare(b.name);
    case "score":
      return (b.anilistAverageScore ?? -1) - (a.anilistAverageScore ?? -1);
    case "popularity":
      return (b.anilistPopularity ?? -1) - (a.anilistPopularity ?? -1);
    case "community":
      return (b.communityScore ?? -1) - (a.communityScore ?? -1);
    case "seals":
      return b.certifiedBangerCount - a.certifiedBangerCount;
    case "recent":
      return (b.lastReviewedAt?.getTime() ?? 0) - (a.lastReviewedAt?.getTime() ?? 0);
    case "discussed":
      return b.discussionCount - a.discussionCount;
  }
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
  if (minScoreRaw && !Number.isNaN(Number(minScoreRaw))) {
    where.anilistAverageScore = { gte: Number(minScoreRaw) };
  }
  if (minCommunityRaw && !Number.isNaN(Number(minCommunityRaw))) {
    where.communityScore = { gte: Number(minCommunityRaw) };
  }

  const titles = await prisma.title.findMany({ where, take: 100 });

  // On-demand catalog growth: rather than mirroring AniList's whole ~60k+
  // manga database up front (real rate-limit/storage cost for no product
  // benefit), any search, genre, Format, or Status filter also pulls in
  // live AniList results — merged into the exact same grid as local
  // results (below), not a separate "not really ours" section, since the
  // site's search is meant to feel like it covers everything AniList has,
  // the same way AniList's own search does. Skipped when a filter is
  // active that an unimported title structurally can never satisfy (the
  // seal checkbox, minimum community score — both are review-driven, and
  // an unimported title has no reviews).
  const skipAniList = hasCertifiedBanger || !!minCommunityRaw;
  let aniListCards: UnifiedCard[] = [];
  if (!skipAniList && (q.length >= 2 || genre || type || status)) {
    try {
      const results = await browseAniListMedia({
        search: q.length >= 2 ? q : undefined,
        genre: genre || undefined,
        type: type || undefined,
        status: status || undefined,
        perPage: 30,
      });
      const alreadyImported = await prisma.title.findMany({
        where: { anilistId: { in: results.map((r) => r.anilistId) } },
        select: { anilistId: true },
      });
      const importedIds = new Set(alreadyImported.map((t) => t.anilistId));
      const minScore = minScoreRaw && !Number.isNaN(Number(minScoreRaw)) ? Number(minScoreRaw) : null;

      aniListCards = results
        .filter((r) => !importedIds.has(r.anilistId))
        .filter((r) => minScore === null || (r.averageScore !== null && r.averageScore >= minScore))
        .map((r) => ({
          id: `anilist-${r.anilistId}`,
          href: `/titles/anilist/${r.anilistId}`,
          name: r.name,
          type: r.type,
          coverUrl: r.coverImageUrl,
          anilistAverageScore: r.averageScore,
          anilistPopularity: r.popularity,
          communityScore: null,
          lastReviewedAt: null,
          discussionCount: 0,
          reviewCount: 0,
          certifiedBangerCount: 0,
        }));
    } catch {
      // AniList being slow/unreachable shouldn't break the browse page —
      // it just falls back to local-only results.
      aniListCards = [];
    }
  }

  const cards: UnifiedCard[] = [...titles, ...aniListCards].sort((a, b) => compareCards(a, b, sort));

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

        <button type="submit" className={BUTTON_PRIMARY}>
          Apply
        </button>
      </form>

      {cards.length > 0 ? (
        <TitleCardGrid titles={cards} />
      ) : (
        <p className="py-6 text-sm text-muted">No titles match these filters.</p>
      )}
    </div>
  );
}
