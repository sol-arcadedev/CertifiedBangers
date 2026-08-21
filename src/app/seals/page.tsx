import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TitleCardGrid } from "@/components/title-card-grid";
import { LINK } from "@/lib/ui-classes";

// Dedicated discovery feed (WP4.4) — separate from the browse/search page
// (WP5.1), and from the homepage's own smaller highlight sections. Reads
// the precomputed certifiedBangerCount (Entry 39), never live-joins against
// SealAward.
export default async function SealsPage() {
  const certifiedBangers = await prisma.title.findMany({
    where: { certifiedBangerCount: { gt: 0 } },
    orderBy: [{ certifiedBangerCount: "desc" }, { reviewCount: "desc" }],
    take: 24,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Seals</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        🏅 Certified Banger marks reviews the community (or an admin) has verified as genuinely
        exceptional.
      </p>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">🏅 Certified Bangers</h2>
        {certifiedBangers.length > 0 ? (
          <div className="mt-4">
            <TitleCardGrid titles={certifiedBangers} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No titles have earned Certified Banger yet.</p>
        )}
      </div>

      <p className="mt-10 text-sm text-muted">
        <Link href="/titles" className={LINK}>
          Browse all titles
        </Link>
      </p>
    </div>
  );
}
