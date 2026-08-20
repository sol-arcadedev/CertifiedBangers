import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";
import { LatestReviews } from "@/components/latest-reviews";
import { getDistinctGenres } from "@/lib/genres";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";
import { INPUT, LABEL, BUTTON_PRIMARY, LINK, CARD } from "@/lib/ui-classes";

export default async function Home() {
  const [certifiedBangers, hiddenGems, mostPopular, highestRated, genres, latestReviews] =
    await Promise.all([
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
    prisma.review.findMany({
      where: { approvalStatus: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        bodyText: true,
        overallScore: true,
        title: { select: { id: true, name: true, coverUrl: true } },
        user: { select: { username: true, role: true } },
        sealAwards: { select: { sealType: { select: { name: true } } } },
      },
    }),
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
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            background:
              "radial-gradient(ellipse 42% 55% at 80% 20%, var(--accent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-6 pt-16 sm:pt-20 lg:flex-row lg:items-center lg:text-left">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Certified<span className="text-accent">Banger</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/90">
              A community-curated home for honest, detailed manga &amp; manhwa reviews. Every
              review here comes from someone who actually finished the story and rated it across
              five real categories — not a single opaque star rating.
            </p>
            <p className="mt-3 max-w-xl text-sm text-muted">
              The goal: as reviews add up, the exceptional titles rise to the top — including the
              ones flying under the radar that deserve a wider audience.
            </p>
          </div>

          <div className="shrink-0">
            <Image
              src="/CB-WAIFU.png"
              alt=""
              width={420}
              height={420}
              priority
              className="h-auto w-56 select-none sm:w-72 lg:w-80"
            />
          </div>
        </div>

        <div className="relative px-4 pb-14">
          <form
            className={`mx-auto flex w-full max-w-4xl flex-wrap items-end justify-center gap-4 p-4 sm:p-5 ${CARD}`}
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

      {latestReviews.length > 0 && (
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Latest Reviews</h2>
            <Link href="/titles?sort=recent" className={`text-sm ${LINK}`}>
              View all
            </Link>
          </div>
          <div className="mt-4">
            <LatestReviews reviews={latestReviews} />
          </div>
        </div>
      )}

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
