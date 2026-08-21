// Recomputes User.reputationScore for every user from their existing
// reviews/votes/seals. Needed once after the reputation system shipped
// (Journal Entry 46) so pre-existing activity counts retroactively rather
// than everyone starting at 0 and only earning points from here on; safe
// to re-run any time the reputation formula changes, since
// recomputeUserReputation always derives the score from scratch.
//
// Unlike scripts/refresh-anilist-data.ts, this imports src/lib/prisma.ts
// and src/lib/user-reputation.ts directly rather than duplicating their
// logic — neither has a "server-only" import guard (plain Prisma
// queries), so there's no reason to fork the connection setup or the
// reputation formula into a second copy.
//
// Run with: npm run backfill:reputation
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { recomputeUserReputation } from "../src/lib/user-reputation";

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await recomputeUserReputation(user.id, prisma);
  }

  console.log(`Recomputed reputation for ${users.length} user(s).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
