import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";
import { getDistinctGenres } from "@/lib/genres";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";
import { INPUT, LABEL, BUTTON_PRIMARY, LINK } from "@/lib/ui-classes";

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

  // Certified Bangers/Hidden Gems lead — the brief calls the seal showcase
  // out explicitly as "your differentiator — make it prominent" (Section 4.5).
  const sections = [
    { heading: "Certified Bangers", emoji: "🏅", titles: certifiedBangers, browseHref: "/seals" },
    { heading: "Hidden Gems", emoji: "💎", titles: hiddenGems, browseHref: "/seals" },
    { heading: "Most Popular", emoji: null, titles: mostPopular, browseHref: "/titles" },
    { heading: "Highest Rated", emoji: null, titles: highestRated, browseHref: "/titles" },
  ].filter((section) => section.titles.length > 0);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, var(--accent), transparent)",
          }}
        />
        <div className="relative flex flex-col items-center px-4 pb-10 pt-16 text-center sm:pt-20">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Certified<span className="text-accent">Banger</span>
          </h1>
          <p className="mt-3 max-w-md text-lg text-muted">
            Community-curated manga/manhwa reviews — find the exceptional reads everyone else
            missed.
          </p>

          <form
            className="mx-auto mt-8 flex w-full max-w-4xl flex-wrap items-end justify-center gap-4"
            action="/titles"
          >
            <label className={`${LABEL} min-w-[200px] flex-1 text-left`}>
              Search
              <input name="q" type="search" placeholder="Name, genre, author…" className={INPUT} />
            </label>

            <label className={`${LABEL} text-left`}>
              Genre
              <select name="genre" defaultValue="" className={INPUT}>
                <option value="">Any</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${LABEL} text-left`}>
              Format
              <select name="type" defaultValue="" className={INPUT}>
                <option value="">Any</option>
                {Object.values(TitleType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${LABEL} text-left`}>
              Status
              <select name="status" defaultValue="" className={INPUT}>
                <option value="">Any</option>
                {Object.values(TitleStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className={`h-[38px] ${BUTTON_PRIMARY}`}>
              Search
            </button>
          </form>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.heading} className="mx-auto w-full max-w-5xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              {section.emoji && <span aria-hidden="true">{section.emoji}</span>}
              {section.heading}
            </h2>
            <Link href={section.browseHref} className={`text-sm ${LINK}`}>
              View all
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
