import Image from "next/image";
import { Search, PenLine, ArrowBigUp, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";
import { LatestReviews } from "@/components/latest-reviews";
import { getDistinctGenres } from "@/lib/genres";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";
import { INPUT, LABEL, BUTTON_PRIMARY, CARD } from "@/lib/ui-classes";
import { SectionHeading } from "@/components/section-heading";

export default async function Home() {
  const [certifiedBangers, mostPopular, highestRated, genres, latestReviews] =
    await Promise.all([
    prisma.title.findMany({
      where: { certifiedBangerCount: { gt: 0 } },
      orderBy: [{ certifiedBangerCount: "desc" }, { reviewCount: "desc" }],
      take: 8,
      include: { discoveredByUser: { select: { username: true } } },
    }),
    prisma.title.findMany({
      orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } },
      take: 8,
      include: { discoveredByUser: { select: { username: true } } },
    }),
    prisma.title.findMany({
      orderBy: { anilistAverageScore: { sort: "desc", nulls: "last" } },
      take: 8,
      include: { discoveredByUser: { select: { username: true } } },
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

  // Certified Bangers lead — the brief calls the seal showcase out
  // explicitly as "your differentiator — make it prominent" (Section 4.5).
  // Entry 67: given its own visually distinct showcase treatment below
  // rather than sitting in the same generic loop as Most Popular/Highest
  // Rated — "prominent" should mean it actually looks different, not just
  // appears first in an identical list.
  const rankedSections = [
    { heading: "Most Popular", titles: mostPopular, browseHref: "/titles" },
    { heading: "Highest Rated", titles: highestRated, browseHref: "/titles" },
  ].filter((section) => section.titles.length > 0);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="relative overflow-hidden border-b border-border">
        <Image
          src="/Hero-Background.jpg"
          alt=""
          fill
          priority
          className="pointer-events-none object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-background/55" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-6 pt-16 sm:pt-20 lg:flex-row lg:items-center lg:text-left">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="animate-reveal font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              Certified<span className="text-accent">Banger</span>
            </h1>
            <p className="animate-reveal mt-4 max-w-2xl text-lg leading-8 text-foreground/90 [animation-delay:100ms]">
              CertifiedBanger is a place to write reviews for manga you&apos;d call peak — a
              certified banger, a genuinely great read. No reviews for mid titles, just
              recommendations worth reading.
            </p>
          </div>

          <div className="animate-reveal relative shrink-0 [animation-delay:200ms]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full bg-accent/25 blur-3xl"
            />
            <Image
              src="/CB-WAIFU.png"
              alt=""
              width={420}
              height={420}
              priority
              className="h-auto w-56 select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] sm:w-72 lg:w-80"
            />
          </div>
        </div>

        {/* How it works (Entry 69/70) — added right on the hero since the
            mechanic isn't obvious just from browsing. Deliberately not
            framed as "80% upvote ratio" (stale copy this replaced) — the
            real gate is a net-vote-score threshold, admin-tunable, not a
            fixed ratio. Also deliberately doesn't claim "one seal" or
            "more than one" — that's an implementation detail (a review
            earns the seal, not the title directly, so more than one
            review on a title can independently earn it) that doesn't need
            to be marketing copy; the user-facing story is just the
            personal-motivation loop: write well, get upvoted, get
            recognized, help the title get found. */}
        <div className="relative mx-auto max-w-5xl px-4 pb-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: PenLine,
                title: "Write the review",
                description:
                  "Just finished something you'd call a banger? Write a review explaining why.",
              },
              {
                icon: ArrowBigUp,
                title: "The community votes",
                description:
                  "Other readers see your review and upvote it if they agree it's worth reading.",
              },
              {
                icon: Award,
                title: "Earn the seal",
                description:
                  "Enough net upvotes and your review earns the 🏅 Certified Banger seal — with your name on it, helping other readers find this title and give it a chance.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                style={{ animationDelay: `${300 + i * 100}ms` }}
                className={`animate-reveal flex gap-3 p-4 ${CARD}`}
              >
                <step.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
                <div>
                  <div className="font-display text-sm font-bold text-foreground">{step.title}</div>
                  <p className="mt-1 text-sm text-muted">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative px-4 pb-14">
          <form
            className={`animate-reveal mx-auto flex w-full max-w-4xl flex-wrap items-end justify-center gap-4 p-4 sm:p-5 [animation-delay:600ms] ${CARD}`}
            action="/titles"
          >
            <label className={`${LABEL} min-w-[200px] flex-1 text-left`}>
              Search
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
                <input
                  name="q"
                  type="search"
                  placeholder="Name, genre, author…"
                  className="w-full rounded-lg border border-border bg-panel py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
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
          <SectionHeading href="/titles?sort=recent">Latest Reviews</SectionHeading>
          <div className="mt-4">
            <LatestReviews reviews={latestReviews} />
          </div>
        </div>
      )}

      {certifiedBangers.length > 0 && (
        <div className="relative overflow-hidden border-y border-accent/20 bg-gradient-to-b from-accent/10 via-accent/[0.03] to-transparent">
          <div className="mx-auto w-full max-w-5xl px-6 py-10">
            <SectionHeading emoji="🏅" href="/seals">
              Certified Bangers
            </SectionHeading>
            <div className="mt-4">
              <TitleCardGrid titles={certifiedBangers} />
            </div>
          </div>
        </div>
      )}

      {rankedSections.map((section) => (
        <div key={section.heading} className="mx-auto w-full max-w-5xl px-6 py-10">
          <SectionHeading href={section.browseHref}>{section.heading}</SectionHeading>
          <div className="mt-4">
            <TitleCardGrid titles={section.titles} />
          </div>
        </div>
      ))}
    </div>
  );
}
