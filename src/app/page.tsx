import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";

// "Certified Bangers" / "Hidden Gems" sections deliberately aren't here yet —
// seal-awarding (WP4.1-4.3) doesn't exist in the app at all, so there's
// nothing to show. Add them once seals are actually built.
export default async function Home() {
  const [mostPopular, highestRated] = await Promise.all([
    prisma.title.findMany({
      orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } },
      take: 8,
    }),
    prisma.title.findMany({
      orderBy: { anilistAverageScore: { sort: "desc", nulls: "last" } },
      take: 8,
    }),
  ]);

  const sections = [
    { heading: "Most Popular", titles: mostPopular },
    { heading: "Highest Rated", titles: highestRated },
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

      {sections.map((section) => (
        <div key={section.heading} className="mx-auto w-full max-w-4xl px-6 pb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {section.heading}
            </h2>
            <Link href="/titles" className="text-sm text-zinc-600 underline dark:text-zinc-400">
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
