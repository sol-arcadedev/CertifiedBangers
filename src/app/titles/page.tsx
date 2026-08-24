import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { TitleStatus, TitleType } from "@/generated/prisma/enums";
import { LiveSearchInput } from "@/components/live-search-input";
import { TitleCardGrid } from "@/components/title-card-grid";
import { getDistinctGenres } from "@/lib/genres";
import { searchTitleIds } from "@/lib/title-search";
import { INPUT, LABEL, BUTTON_PRIMARY } from "@/lib/ui-classes";

const PAGE_SIZE = 24;

// Entry 58: every sort option maps directly to a real, indexed-or-plain
// column on Title now that the whole catalog is mirrored locally — sorting
// happens in the DB via `orderBy` (and pagination via skip/take), not by
// fetching everything and sorting in JS.
const SORT_OPTIONS = {
  name: { label: "Name", orderBy: { name: "asc" } },
  score: { label: "AniList score", orderBy: { anilistAverageScore: { sort: "desc", nulls: "last" } } },
  popularity: { label: "AniList popularity", orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } } },
  community: { label: "Highest overall score", orderBy: { communityScore: { sort: "desc", nulls: "last" } } },
  seals: { label: "Most seals", orderBy: { certifiedBangerCount: "desc" } },
  recent: { label: "Most recent reviews", orderBy: { lastReviewedAt: { sort: "desc", nulls: "last" } } },
  discussed: { label: "Most discussed", orderBy: { discussionCount: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.TitleOrderByWithRelationInput }>;

type SortKey = keyof typeof SORT_OPTIONS;

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
  const pageParam = Number(param("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [matchingIds, genres] = await Promise.all([
    q.length >= 2 ? searchTitleIds(q) : null,
    getDistinctGenres(),
  ]);

  // Entry 56: the whole AniList catalog is mirrored and refreshed locally
  // now, so every filter is a plain, trustworthy `where` clause again — no
  // live-fetch/hydration needed at render time. Entry 58: dropped the
  // live AniList blend that used to sit alongside this — the mirror is
  // complete and refreshed daily, so it rarely surfaced anything a local
  // search wouldn't, at the cost of an external HTTP round-trip on nearly
  // every filtered search. A brand-new AniList title not yet in the
  // mirror is still reachable via /titles/anilist/[anilistId] directly
  // (e.g. from the admin import flow) — just not blended into browse.
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

  const [cards, totalCount] = await Promise.all([
    prisma.title.findMany({
      where,
      orderBy: SORT_OPTIONS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.title.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (genre) params.set("genre", genre);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (hasCertifiedBanger) params.set("hasCB", "1");
    if (minScoreRaw) params.set("minScore", minScoreRaw);
    if (minCommunityRaw) params.set("minCommunity", minCommunityRaw);
    if (sort !== "name") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/titles?${qs}` : "/titles";
  };

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
        <>
          <TitleCardGrid titles={cards} />
          <div className="mt-8 flex items-center justify-between text-sm text-muted">
            <span>
              {totalCount.toLocaleString()} title{totalCount === 1 ? "" : "s"} · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={pageHref(page - 1)} className={BUTTON_PRIMARY}>
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a href={pageHref(page + 1)} className={BUTTON_PRIMARY}>
                  Next
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="py-6 text-sm text-muted">No titles match these filters.</p>
      )}
    </div>
  );
}
