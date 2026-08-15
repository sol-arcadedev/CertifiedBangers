import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";

// Dedicated discovery feed (WP4.4) — separate from the browse/search page
// (WP5.1), and from the homepage's own smaller highlight sections. Reads
// the precomputed certifiedBangerCount/hiddenGemCount (Entry 39), never
// live-joins against SealAward.
export default async function SealsPage() {
  const [certifiedBangers, hiddenGems] = await Promise.all([
    prisma.title.findMany({
      where: { certifiedBangerCount: { gt: 0 } },
      orderBy: [{ certifiedBangerCount: "desc" }, { reviewCount: "desc" }],
      take: 24,
    }),
    prisma.title.findMany({
      where: { hiddenGemCount: { gt: 0 } },
      orderBy: [{ hiddenGemCount: "desc" }, { reviewCount: "desc" }],
      take: 24,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Seals</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        🏅 Certified Banger marks reviews the community (or an admin) has verified as genuinely
        exceptional. 💎 Hidden Gem surfaces the same quality bar on titles that haven&apos;t found
        a wide audience yet.
      </p>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          🏅 Certified Bangers
        </h2>
        {certifiedBangers.length > 0 ? (
          <div className="mt-4">
            <TitleCardGrid titles={certifiedBangers} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No titles have earned Certified Banger yet.
          </p>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">💎 Hidden Gems</h2>
        {hiddenGems.length > 0 ? (
          <div className="mt-4">
            <TitleCardGrid titles={hiddenGems} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No titles have earned Hidden Gem yet.
          </p>
        )}
      </div>

      <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/titles" className="underline">
          Browse all titles
        </Link>
      </p>
    </div>
  );
}
