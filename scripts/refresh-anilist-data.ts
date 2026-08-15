// Refreshes anilistAverageScore/anilistPopularity for every already-imported
// title (matched by anilistId). AniList's numbers drift as more people rate
// a title, so a one-time import snapshot goes stale — this is meant to be
// re-run periodically. Only touches those two fields, never anything
// admin-editable (genres, synopsis, etc.), in case they've been hand-corrected
// since import.
//
// Self-contained rather than importing src/lib/anilist.ts — see
// scripts/seed-default-titles.ts's header comment for why.
//
// Run with: npm run refresh:anilist-data
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id, type: MANGA) { averageScore popularity } }`,
          variables: { id: title.anilistId },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.errors?.length || !json.data.Media) {
        console.log(`  x failed for "${title.name}"`);
        failed++;
        continue;
      }

      await prisma.title.update({
        where: { id: title.id },
        data: {
          anilistAverageScore: json.data.Media.averageScore,
          anilistPopularity: json.data.Media.popularity,
        },
      });
      console.log(`  + refreshed: ${title.name} (score=${json.data.Media.averageScore}, popularity=${json.data.Media.popularity})`);
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
