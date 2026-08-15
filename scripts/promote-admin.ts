// There's no UI for role management yet (that's admin-panel territory,
// WP6.1) and someone has to bootstrap the first Main Admin somehow — so
// this is a one-off CLI, not an app feature. Journal Entry 28: the Main
// Admin is initially the founder/owner.
// Run with: npm run promote-admin -- <username> <ADMIN|MAIN_ADMIN>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const [username, role] = process.argv.slice(2);

  if (!username || (role !== "ADMIN" && role !== "MAIN_ADMIN")) {
    console.error("Usage: npm run promote-admin -- <username> <ADMIN|MAIN_ADMIN>");
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.update({
    where: { username },
    data: { role },
  });

  console.log(`${user.username} is now ${user.role}.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
