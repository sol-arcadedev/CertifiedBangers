import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const SORT_OPTIONS = {
  name: { label: "Name", orderBy: { name: "asc" } },
  score: {
    label: "AniList score",
    orderBy: { anilistAverageScore: { sort: "desc", nulls: "last" } },
  },
  popularity: {
    label: "AniList popularity",
    orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } },
  },
} satisfies Record<string, { label: string; orderBy: Prisma.TitleOrderByWithRelationInput }>;

type SortKey = keyof typeof SORT_OPTIONS;

// Sort/filter here is intentionally narrow — just the two AniList reference
// fields the user asked for. The fuller genre/status/full-text-search
// browse experience is still WP5.1's job.
export default async function TitlesPage(props: PageProps<"/titles">) {
  const searchParams = await props.searchParams;
  const sortParam = typeof searchParams.sort === "string" ? searchParams.sort : "name";
  const sort: SortKey = sortParam in SORT_OPTIONS ? (sortParam as SortKey) : "name";
  const minScoreRaw = typeof searchParams.minScore === "string" ? searchParams.minScore : "";
  const minScore = minScoreRaw ? Number(minScoreRaw) : null;

  const titles = await prisma.title.findMany({
    where:
      minScore !== null && !Number.isNaN(minScore)
        ? { anilistAverageScore: { gte: minScore } }
        : undefined,
    orderBy: SORT_OPTIONS[sort].orderBy,
    take: 100,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">Titles</h1>

      <form className="mb-6 flex flex-wrap items-end gap-4" action="/titles">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Sort by
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
              <option key={key} value={key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Min. AniList score
          <input
            name="minScore"
            type="number"
            min={0}
            max={100}
            defaultValue={minScoreRaw}
            placeholder="0-100"
            className="w-28 rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          Apply
        </button>
      </form>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {titles.map((title) => (
          <li key={title.id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
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
              <div>
                <Link
                  href={`/titles/${title.id}`}
                  className="font-medium text-black dark:text-zinc-50"
                >
                  {title.name}
                </Link>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {title.type} · {title.status}
                  {title.reviewCount > 0 ? ` · ${title.reviewCount} reviews` : ""}
                </div>
              </div>
            </div>
            {(title.anilistAverageScore !== null || title.anilistPopularity !== null) && (
              <div className="text-right text-sm text-zinc-500 dark:text-zinc-400">
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
