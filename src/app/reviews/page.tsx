import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TitleStatus, TitleType } from "@/generated/prisma/enums";
import { LiveSearchInput } from "@/components/live-search-input";
import { LatestReviews } from "@/components/latest-reviews";
import { searchTitleIds } from "@/lib/title-search";
import { getDistinctGenres } from "@/lib/genres";
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
  // "reviews on titles tagged Comedy." Entry 56: the whole AniList catalog
  // is mirrored and refreshed locally now, so this is a plain, trustworthy
  // `where` clause again for every title, not just manual ones.
  const titleWhere: Prisma.TitleWhereInput = {};
  if (matchingIds) titleWhere.id = { in: matchingIds };
  if (genre) titleWhere.genres = { has: genre };
  if (type) titleWhere.type = type;
  if (status) titleWhere.status = status;
  const hasTitleFilter = Object.keys(titleWhere).length > 0;

  const reviews = await prisma.review.findMany({
    where: {
      approvalStatus: "PUBLISHED",
      ...(hasTitleFilter ? { title: titleWhere } : {}),
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
      <h1 className="mb-6 font-display text-xl font-bold text-foreground">Reviews</h1>

      <form className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-panel p-4" action="/reviews">
        <label className={`${LABEL} min-w-[200px] flex-1`}>
          Search
          <LiveSearchInput defaultValue={q} />
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
