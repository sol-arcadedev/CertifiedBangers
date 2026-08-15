import { prisma } from "@/lib/prisma";

const DEFAULT_MIN_ACCOUNT_AGE_DAYS = 3;
const DEFAULT_SEAL_QUALITY_GATE_THRESHOLD = 20;
const DEFAULT_SEAL_POPULARITY_GATE_THRESHOLD = 100;

// Falls back to the documented defaults (Entry 40, Entry 29) if the
// singleton row is somehow missing — e.g. a fresh DB where
// `prisma db seed` hasn't run yet — rather than letting the gates
// silently pass everyone/everything.
export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
  return (
    settings ?? {
      minAccountAgeDays: DEFAULT_MIN_ACCOUNT_AGE_DAYS,
      sealQualityGateThreshold: DEFAULT_SEAL_QUALITY_GATE_THRESHOLD,
      sealPopularityGateThreshold: DEFAULT_SEAL_POPULARITY_GATE_THRESHOLD,
    }
  );
}
