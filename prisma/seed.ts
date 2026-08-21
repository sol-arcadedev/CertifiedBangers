// Seeds the data-driven Category (Entry 2) and SealType (Entry 14/15) tables.
// Run with: npx prisma db seed

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Art Style" },
  { name: "Character" },
  { name: "Plot" },
  { name: "Pacing" },
  { name: "Uniqueness" },
] as const;

const SEAL_TYPES = [
  {
    name: "Certified Banger",
    description:
      "The flagship seal awarded to reviews recognized as exceptional quality, verified via admin review or community vote threshold.",
    icon: "banger",
  },
] as const;

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        appliesToType: ["MANGA", "MANHWA", "MANHUA"],
        scaleMin: 1,
        scaleMax: 10,
      },
    });
  }

  for (const sealType of SEAL_TYPES) {
    await prisma.sealType.upsert({
      where: { name: sealType.name },
      update: {},
      create: sealType,
    });
  }

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${SEAL_TYPES.length} seal types, and platform settings.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
