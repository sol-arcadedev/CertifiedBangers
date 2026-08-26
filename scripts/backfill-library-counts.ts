// Recomputes Title.libraryCount (Entry 77's "Most Follows" proxy) for every
// title that actually has LibraryEntry rows. Needed once after the column
// shipped so pre-existing library activity counts retroactively rather than
// every title starting at 0; safe to re-run any time, since
// recomputeTitleLibraryCount always derives the count from scratch.
//
// Only touches titles with at least one LibraryEntry row (found via
// groupBy) rather than iterating all ~127k mirrored titles, since the vast
// majority have never been added to anyone's library.
//
// Run with: npm run backfill:library-counts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { recomputeTitleLibraryCount } from "../src/lib/title-aggregates";

async function main() {
  const titles = await prisma.libraryEntry.groupBy({ by: ["titleId"] });

  for (const { titleId } of titles) {
    await recomputeTitleLibraryCount(titleId, prisma);
  }

  console.log(`Recomputed libraryCount for ${titles.length} title(s).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
