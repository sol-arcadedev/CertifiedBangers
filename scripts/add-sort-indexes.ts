// One-off DDL: adds DESC NULLS LAST indexes for /titles' four nullable
// sort columns (Entry 58). Prisma's schema.prisma @@index can't express
// NULLS ordering, and a plain ascending index doesn't satisfy an
// `orderBy: { col: { sort: "desc", nulls: "last" } }` query — Postgres
// falls back to a full seq scan of every full-width row regardless of
// how many rows are actually null (confirmed: even anilistPopularity,
// which is non-null on ~100% of the 127k mirrored titles, was ~5s
// without this). Run against the session pooler (port 5432), not the
// transaction pooler (6543) — see scripts/add-search-index.ts for why.
//
// IMPORTANT: `prisma db push` drops these indexes (confirmed by hitting
// it directly — see the searchVector comment in schema.prisma). Re-run
// this script (and scripts/add-search-index.ts) after any db push.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const sessionPoolerUrl = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
const adapter = new PrismaPg({ connectionString: sessionPoolerUrl });
const prisma = new PrismaClient({ adapter });

const INDEXES: [name: string, column: string][] = [
  ["titles_anilist_score_desc_idx", "anilistAverageScore"],
  ["titles_anilist_popularity_desc_idx", "anilistPopularity"],
  ["titles_community_score_desc_idx", "communityScore"],
  ["titles_last_reviewed_at_desc_idx", "lastReviewedAt"],
];

async function main() {
  for (const [name, column] of INDEXES) {
    console.log(`Creating ${name}...`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS ${name} ON titles ("${column}" DESC NULLS LAST)`,
    );
  }
  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
