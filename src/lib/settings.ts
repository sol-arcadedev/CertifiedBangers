import { prisma } from "@/lib/prisma";

const DEFAULT_MIN_ACCOUNT_AGE_DAYS = 3;

// Falls back to the documented default (Entry 40) if the singleton row is
// somehow missing — e.g. a fresh DB where `prisma db seed` hasn't run yet —
// rather than letting the gate silently pass everyone.
export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
  return settings ?? { minAccountAgeDays: DEFAULT_MIN_ACCOUNT_AGE_DAYS };
}
