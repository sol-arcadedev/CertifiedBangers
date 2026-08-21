import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TitleStatus, TitleType } from "@/generated/prisma/enums";
import { LiveSearchInput } from "@/components/live-search-input";
import { TitleCardGrid } from "@/components/title-card-grid";
import { browseAniListMedia } from "@/lib/anilist";
import { hydrateWithLiveAniListData } from "@/lib/anilist-linked-titles";
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

// One unified shape for local (manual + already-imported), and AniList-only
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
  const minScore = minScoreRaw && !Number.isNaN(Number(minScoreRaw)) ? Number(minScoreRaw) : null;
  const minCommunity =
    minCommunityRaw && !Number.isNaN(Number(minCommunityRaw)) ? Number(minCommunityRaw) : null;
  const sortParam = param("sort") || "name";
  const sort: SortKey = sortParam in SORT_OPTIONS ? (sortParam as SortKey) : "name";

  const [matchingManualIds, genres] = await Promise.all([
    q.length >= 2 ? searchTitleIds(q) : null,
    getDistinctGenres(),
  ]);

  // Manual titles (anilistId IS NULL) are still fully locally-stored/
  // filterable — unaffected by Entry 52. `type` is filterable on imported
  // titles here too since it's a locally-cached, never-stale exception.
  const commonWhere: Prisma.TitleWhereInput = {};
  if (type) commonWhere.type = type;
  if (hasCertifiedBanger) commonWhere.certifiedBangerCount = { gt: 0 };
  if (minCommunity !== null) commonWhere.communityScore = { gte: minCommunity };

  const manualWhere: Prisma.TitleWhereInput = { ...commonWhere, anilistId: null };
  if (matchingManualIds) manualWhere.id = { in: matchingManualIds };
  if (genre) manualWhere.genres = { has: genre };
  if (status) manualWhere.status = status;
  if (minScore !== null) manualWhere.anilistAverageScore = { gte: minScore };

  // Entry 52: genre/synopsis/status/scores are no longer trustworthy on the
  // local row for an already-imported title, so matching one against these
  // filters requires live AniList data — batch-hydrate every imported
  // title (a small, bounded set: "everything we've ever imported", not
  // AniList's whole catalog) rather than trusting stale local columns.
  const importedTitles = await prisma.title.findMany({
    where: { ...commonWhere, anilistId: { not: null } },
    select: {
      id: true,
      anilistId: true,
      name: true,
      type: true,
      coverUrl: true,
      communityScore: true,
      lastReviewedAt: true,
      discussionCount: true,
      reviewCount: true,
      certifiedBangerCount: true,
    },
  });
  const hydratedImported = await hydrateWithLiveAniListData(importedTitles);

  const qLower = q.toLowerCase();
  const importedCards: UnifiedCard[] = hydratedImported
    .filter((t) => {
      if (genre && !(t.live?.genres.includes(genre) ?? false)) return false;
      if (status && t.live?.status !== status) return false;
      if (minScore !== null && (t.live?.averageScore ?? -1) < minScore) return false;
      if (q.length >= 2) {
        const haystack = [t.live?.name ?? t.name, t.live?.titleRomaji, t.live?.titleEnglish, t.live?.titleNative, ...(t.live?.genres ?? []), ...(t.live?.synonyms ?? [])]
          .filter((s): s is string => !!s)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }
      return true;
    })
    .map((t) => ({
      id: t.id,
      name: t.live?.name ?? t.name,
      type: t.type,
      coverUrl: t.coverUrl,
      anilistAverageScore: t.live?.averageScore ?? null,
      anilistPopularity: t.live?.popularity ?? null,
      communityScore: t.communityScore,
      lastReviewedAt: t.lastReviewedAt,
      discussionCount: t.discussionCount,
      reviewCount: t.reviewCount,
      certifiedBangerCount: t.certifiedBangerCount,
    }));

  const manualTitles = await prisma.title.findMany({ where: manualWhere, take: 100 });

  // On-demand catalog growth: rather than mirroring AniList's whole ~60k+
  // manga database up front (real rate-limit/storage cost for no product
  // benefit), any search, genre, Format, Status, or minScore filter also
  // pulls in live AniList results for titles we haven't imported yet —
  // merged into the exact same grid as local results (below), not a
  // separate "not really ours" section, since the site's search is meant
  // to feel like it covers everything AniList has, the same way AniList's
  // own search does. Skipped when a filter is active that an unimported
  // title structurally can never satisfy (the seal checkbox, minimum
  // community score — both are review-driven, and an unimported title has
  // no reviews).
  const skipAniList = hasCertifiedBanger || minCommunity !== null;
  let aniListCards: UnifiedCard[] = [];
  if (!skipAniList && (q.length >= 2 || genre || type || status || minScore !== null)) {
    try {
      const results = await browseAniListMedia({
        search: q.length >= 2 ? q : undefined,
        genre: genre || undefined,
        type: type || undefined,
        status: status || undefined,
        perPage: 30,
      });
      const importedIds = new Set(importedTitles.map((t) => t.anilistId));

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

  const cards: UnifiedCard[] = [...manualTitles, ...importedCards, ...aniListCards].sort((a, b) =>
    compareCards(a, b, sort),
  );

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
