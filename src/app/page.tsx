import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";
import { getDistinctGenres } from "@/lib/genres";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";

export default async function Home() {
  const [certifiedBangers, hiddenGems, mostPopular, highestRated, genres] = await Promise.all([
    prisma.title.findMany({
      where: { certifiedBangerCount: { gt: 0 } },
      orderBy: [{ certifiedBangerCount: "desc" }, { reviewCount: "desc" }],
      take: 8,
    }),
    prisma.title.findMany({
      where: { hiddenGemCount: { gt: 0 } },
      orderBy: [{ hiddenGemCount: "desc" }, { reviewCount: "desc" }],
      take: 8,
    }),
    prisma.title.findMany({
      orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } },
      take: 8,
    }),
    prisma.title.findMany({
      orderBy: { anilistAverageScore: { sort: "desc", nulls: "last" } },
      take: 8,
    }),
    getDistinctGenres(),
  ]);

  const inputClass =
    "rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50";
  const labelClass = "flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300";

  // Certified Bangers/Hidden Gems lead — the brief calls the seal showcase
  // out explicitly as "your differentiator — make it prominent" (Section 4.5).
  const sections = [
    { heading: "🏅 Certified Bangers", titles: certifiedBangers, browseHref: "/seals" },
    { heading: "💎 Hidden Gems", titles: hiddenGems, browseHref: "/seals" },
    { heading: "Most Popular", titles: mostPopular, browseHref: "/titles" },
    { heading: "Highest Rated", titles: highestRated, browseHref: "/titles" },
  ].filter((section) => section.titles.length > 0);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          CertifiedBanger
        </h1>
        <p className="mt-3 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Community-curated manga/manhwa reviews.
        </p>
      </div>

      <form
        className="mx-auto mb-12 flex w-full max-w-4xl flex-wrap items-end gap-4 px-6"
        action="/titles"
      >
        <label className={`${labelClass} min-w-[200px] flex-1`}>
          Search
          <input name="q" type="search" placeholder="Name, genre, author…" className={inputClass} />
        </label>

        <label className={labelClass}>
          Genre
          <select name="genre" defaultValue="" className={inputClass}>
            <option value="">Any</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Format
          <select name="type" defaultValue="" className={inputClass}>
            <option value="">Any</option>
            {Object.values(TitleType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Status
          <select name="status" defaultValue="" className={inputClass}>
            <option value="">Any</option>
            {Object.values(TitleStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-[38px] rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Search
        </button>
      </form>

      {sections.map((section) => (
        <div key={section.heading} className="mx-auto w-full max-w-4xl px-6 pb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {section.heading}
            </h2>
            <Link
              href={section.browseHref}
              className="text-sm text-zinc-600 underline dark:text-zinc-400"
            >
              Browse all
            </Link>
          </div>
          <div className="mt-4">
            <TitleCardGrid titles={section.titles} />
          </div>
        </div>
      ))}
    </div>
  );
}
