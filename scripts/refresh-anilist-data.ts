// Refreshes the AniList-sourced reference fields for every already-imported
// title (matched by anilistId): scores/popularity/favourites drift as more
// people rate a title, and this also backfills fields added after a title
// was first imported. Only touches fields with no manual-edit UI anywhere
// (never genres/synopsis/status/etc., and never synonyms — that one's
// editable via the manual title form, same protection as genres/synopsis).
//
// Self-contained rather than importing src/lib/anilist.ts — see
// scripts/seed-default-titles.ts's header comment for why.
//
// Run with: npm run refresh:anilist-data
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      title { romaji english native }
      startDate { month day }
      averageScore
      meanScore
      popularity
      favourites
      source
    }
  }
`;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const titles = await prisma.title.findMany({
    where: { anilistId: { not: null } },
    select: { id: true, anilistId: true, name: true },
  });

  let updated = 0;
  let failed = 0;

  for (const title of titles) {
    try {
      const res = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { id: title.anilistId } }),
      });
      const json = await res.json();
      if (!res.ok || json.errors?.length || !json.data.Media) {
        console.log(`  x failed for "${title.name}"`);
        failed++;
        continue;
      }

      const media = json.data.Media;
      await prisma.title.update({
        where: { id: title.id },
        data: {
          titleRomaji: media.title.romaji,
          titleEnglish: media.title.english,
          titleNative: media.title.native,
          startMonth: media.startDate.month,
          startDay: media.startDate.day,
          anilistAverageScore: media.averageScore,
          anilistMeanScore: media.meanScore,
          anilistPopularity: media.popularity,
          anilistFavourites: media.favourites,
          anilistSource: media.source,
        },
      });
      console.log(`  + refreshed: ${title.name} (score=${media.averageScore}, popularity=${media.popularity})`);
      updated++;
    } catch (err) {
      console.log(`  x failed for "${title.name}": ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    await sleep(500);
  }

  console.log(`\nDone. Refreshed ${updated}, failed ${failed}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
