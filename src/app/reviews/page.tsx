import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TitleStatus, TitleType } from "@/generated/prisma/enums";
import { LiveSearchInput } from "@/components/live-search-input";
import { LatestReviews } from "@/components/latest-reviews";
import { searchTitleIds } from "@/lib/title-search";
import { getDistinctGenres } from "@/lib/genres";
import { hydrateWithLiveAniListData } from "@/lib/anilist-linked-titles";
import { INPUT, LABEL, BUTTON_PRIMARY } from "@/lib/ui-classes";

const REVIEWS_PER_PAGE = 24;

export default async function ReviewsPage(props: PageProps<"/reviews">) {
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

  const [matchingIds, genres] = await Promise.all([
    q.length >= 2 ? searchTitleIds(q) : null,
    getDistinctGenres(),
  ]);

  // Reviews are filtered by their title's attributes — a review has no
  // independently searchable/filterable metadata of its own (genre, format,
  // status all live on Title), so "filter reviews by genre Comedy" means
  // "reviews on titles tagged Comedy." Entry 52: genre/synopsis/status are
  // no longer trustworthy on the local row for an AniList-linked title, so
  // matching one against these filters needs live AniList data — without
  // this, every genre/Status filter would silently return zero results for
  // virtually every review (almost all reviewed titles are AniList-linked).
  const hasFilter = !!matchingIds || !!genre || !!type || !!status;
  let titleIds: string[] | null = null;

  if (hasFilter) {
    const manualWhere: Prisma.TitleWhereInput = { anilistId: null };
    if (matchingIds) manualWhere.id = { in: matchingIds };
    if (genre) manualWhere.genres = { has: genre };
    if (type) manualWhere.type = type;
    if (status) manualWhere.status = status;

    const [matchingManual, importedTitles] = await Promise.all([
      prisma.title.findMany({ where: manualWhere, select: { id: true } }),
      prisma.title.findMany({
        where: { anilistId: { not: null }, ...(type ? { type } : {}) },
        select: { id: true, anilistId: true, name: true },
      }),
    ]);

    const hydratedImported = await hydrateWithLiveAniListData(importedTitles);
    const qLower = q.toLowerCase();
    const matchingImportedIds = hydratedImported
      .filter((t) => {
        if (genre && !(t.live?.genres.includes(genre) ?? false)) return false;
        if (status && t.live?.status !== status) return false;
        if (q.length >= 2) {
          const haystack = [t.live?.name ?? t.name, t.live?.titleRomaji, t.live?.titleEnglish, t.live?.titleNative, ...(t.live?.genres ?? []), ...(t.live?.synonyms ?? [])]
            .filter((s): s is string => !!s)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(qLower)) return false;
        }
        return true;
      })
      .map((t) => t.id);

    titleIds = [...matchingManual.map((t) => t.id), ...matchingImportedIds];
  }

  const reviews = await prisma.review.findMany({
    where: {
      approvalStatus: "PUBLISHED",
      ...(titleIds ? { titleId: { in: titleIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: REVIEWS_PER_PAGE,
    select: {
      id: true,
      bodyText: true,
      overallScore: true,
      title: { select: { id: true, name: true, coverUrl: true } },
      user: { select: { username: true, role: true } },
      sealAwards: { select: { sealType: { select: { name: true } } } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Reviews</h1>

      <form className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-panel p-4" action="/reviews">
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

        <button type="submit" className={BUTTON_PRIMARY}>
          Apply
        </button>
      </form>

      {reviews.length > 0 ? (
        <LatestReviews reviews={reviews} />
      ) : (
        <p className="py-6 text-sm text-muted">No reviews match these filters.</p>
      )}
    </div>
  );
}
