// One-off migration (Journal Entry 52): nulls out the locally-copied
// AniList metadata on every AniList-linked Title row, now that the app
// live-fetches this data instead of trusting a local copy that used to go
// stale (the original bug report — Tower of God's status/score/popularity
// not matching AniList's real page). Keeps `id`, `anilistId`, `name`,
// `type`, `status`, `coverUrl` (the deliberate cached-fallback fields,
// see src/lib/actions/anilist-import.ts) and every precomputed review
// aggregate untouched. Manual titles (anilistId IS NULL) are unaffected —
// their metadata is still the only copy that exists anywhere.
//
// Modeled on scripts/backfill-reputation.ts's pattern (imports
// src/lib/prisma directly — no "server-only" issue there).
//
// Run with: npx tsx scripts/null-anilist-linked-metadata.ts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.title.updateMany({
    where: { anilistId: { not: null } },
    data: {
      titleRomaji: null,
      titleEnglish: null,
      titleNative: null,
      synonyms: [],
      author: null,
      illustrator: null,
      genres: [],
      synopsis: null,
      publicationYear: null,
      startMonth: null,
      startDay: null,
      externalLinks: [],
      anilistAverageScore: null,
      anilistMeanScore: null,
      anilistPopularity: null,
      anilistFavourites: null,
      anilistSource: null,
    },
  });

  console.log(`Nulled copied metadata on ${result.count} AniList-linked title(s).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
