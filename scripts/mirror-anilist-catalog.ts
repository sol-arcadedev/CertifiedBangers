// One-time (but safely re-runnable/resumable) full-catalog mirror (Journal
// Entry 56): fetches AniList's entire manga/manhwa/manhua catalog (same
// scope the app already uses — type: MANGA, format_in: [MANGA, ONE_SHOT],
// countries JP/KR/CN/TW) and upserts every title locally with full
// metadata + a re-hosted cover image. Safe to re-run: skips cover
// re-download for titles that already have one — the recurring
// scripts/refresh-anilist-catalog.ts handles metadata freshness after
// this initial mirror completes.
//
// A plain unfiltered `Page(media(...))` query caps out at ~5000 reachable
// results (page 100 at perPage 50) — AniList's `pageInfo.total`/
// `hasNextPage`/`lastPage` are unreliable above that ceiling (they report
// the same capped numbers regardless of the real filtered count, verified
// live against AniList's actual API before writing this). This script
// partitions by publication start-year (each year's real total is safely
// under the cap; verified) rather than pulling one unfiltered stream, and
// treats an empty page — not `hasNextPage` — as the real end-of-results
// signal within each partition. A final undated/catch-all pass (no
// startDate filter, capped at the same ~5000-result ceiling) picks up
// anything with no publication date, which the year partitions can't
// reach.
//
// Run with: npx tsx scripts/mirror-anilist-catalog.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  COVER_CONCURRENCY,
  REQUEST_DELAY_MS,
  anilistRequest,
  downloadAndUploadCover,
  mapWithConcurrency,
  mediaToTitleData,
  sleep,
  type Media,
  MEDIA_DETAIL_FIELDS,
} from "./lib/anilist-sync-shared";

const PER_PAGE = 50;
const PAGE_CAP_WARNING = 100; // AniList's observed reachable-page ceiling

const YEAR_QUERY = `
  query ($page: Int, $gt: FuzzyDateInt, $lt: FuzzyDateInt) {
    Page(page: $page, perPage: ${PER_PAGE}) {
      media(type: MANGA, format_in: [MANGA, ONE_SHOT], startDate_greater: $gt, startDate_lesser: $lt, sort: ID) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  }
`;

// FuzzyDateInt (YYYYMMDD as a plain int) helpers for splitting a year into
// month-level ranges when the year itself hits the ~5000-result ceiling.
function utcDateToFuzzy(date: Date): number {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${y}${m}${d}`);
}
function monthRange(year: number, month: number): { gt: number; lt: number } {
  const dayBeforeStart = new Date(Date.UTC(year, month - 1, 1) - 86400000);
  const firstDayOfNextMonth = new Date(Date.UTC(year, month, 1));
  return { gt: utcDateToFuzzy(dayBeforeStart), lt: utcDateToFuzzy(firstDayOfNextMonth) };
}

const UNDATED_QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: ${PER_PAGE}) {
      media(type: MANGA, format_in: [MANGA, ONE_SHOT], sort: ID) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  }
`;

type Counters = { created: number; updated: number; skipped: number; failed: number };

async function upsertMediaList(
  prisma: PrismaClient,
  storage: ReturnType<typeof createClient>["storage"],
  mediaList: Media[],
  counters: Counters,
) {
  if (mediaList.length === 0) return;

  const pageIds = mediaList.map((m) => m.id);
  const existingRows = await prisma.title.findMany({
    where: { anilistId: { in: pageIds } },
    select: { id: true, anilistId: true, coverUrl: true },
  });
  const existingByAnilistId = new Map(existingRows.map((t) => [t.anilistId, t]));

  await mapWithConcurrency(mediaList, COVER_CONCURRENCY, async (media) => {
    try {
      const titleData = mediaToTitleData(media);
      if (!titleData) {
        counters.skipped++;
        return;
      }

      const existing = existingByAnilistId.get(media.id);
      const coverUrl =
        existing?.coverUrl ?? (await downloadAndUploadCover(storage, media.coverImage.large ?? ""));

      if (existing) {
        await prisma.title.update({ where: { id: existing.id }, data: { ...titleData, coverUrl } });
        counters.updated++;
      } else {
        try {
          await prisma.title.create({ data: { anilistId: media.id, ...titleData, coverUrl } });
          counters.created++;
        } catch (err) {
          // A title with the same anilistId can legitimately already exist
          // here even though it wasn't in this page's existingByAnilistId
          // snapshot: AniList's FuzzyDateInt for a year-only date (e.g.
          // 20120000 for "2012, no month/day") satisfies both that year's
          // range AND the prior year's range (20120000 < 20120101), so a
          // media item can surface in two adjacent year partitions. Treat
          // it as an update instead of a hard failure.
          const isUniqueConflict =
            typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
          if (!isUniqueConflict) throw err;
          const row = await prisma.title.findUnique({ where: { anilistId: media.id }, select: { id: true } });
          if (!row) throw err;
          await prisma.title.update({ where: { id: row.id }, data: { ...titleData, coverUrl } });
          counters.updated++;
        }
      }
    } catch (err) {
      counters.failed++;
      console.log(`  x anilistId=${media.id} failed: ${err instanceof Error ? err.message : err}`);
    }
  });
}

// Walks all pages for a single (gt, lt) date range, upserting as it goes.
// Returns whether a page fetch failed (the observed signal for "this range
// has more results than AniList's ~5000-result ceiling reaches").
async function walkRange(
  prisma: PrismaClient,
  storage: ReturnType<typeof createClient>["storage"],
  gt: number,
  lt: number,
  label: string,
  counters: Counters,
): Promise<{ pageCount: number; hitCeiling: boolean }> {
  let page = 1;
  let pageCount = 0;
  for (;;) {
    let data: { Page: { media: Media[] } };
    try {
      data = await anilistRequest<{ Page: { media: Media[] } }>(YEAR_QUERY, { page, gt, lt });
    } catch (err) {
      console.log(
        `  ! ${label} page ${page} failed: ${err instanceof Error ? err.message : err}`,
      );
      return { pageCount, hitCeiling: true };
    }
    const mediaList = data.Page.media;
    if (mediaList.length === 0) break;

    await upsertMediaList(prisma, storage, mediaList, counters);
    pageCount = page;
    if (mediaList.length < PER_PAGE) break; // last (partial) page for this range

    page++;
    await sleep(REQUEST_DELAY_MS);
  }
  return { pageCount, hitCeiling: false };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const counters: Counters = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const currentYear = new Date().getFullYear();
  // 1900 as a safe floor (AniList has no manga entries meaningfully older
  // than this), currentYear+1 to catch not-yet-released/announced titles.
  // START_YEAR/END_YEAR let a re-run target just a subset of years already
  // known to need another pass (e.g. ones that hit the ceiling below)
  // instead of re-walking the whole catalog.
  const startYear = process.env.START_YEAR ? Number(process.env.START_YEAR) : 1900;
  const endYear = process.env.END_YEAR ? Number(process.env.END_YEAR) : currentYear + 1;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  for (const year of years) {
    const gt = Number(`${year - 1}1231`); // strictly after Dec 31 of the prior year
    const lt = Number(`${year + 1}0101`); // strictly before Jan 1 of the next year

    const { pageCount, hitCeiling } = await walkRange(
      prisma,
      supabase.storage,
      gt,
      lt,
      `year ${year}`,
      counters,
    );

    if (hitCeiling) {
      // This year has more results than AniList's ~5000-result ceiling
      // reaches in one date-filtered query — re-walk it month by month
      // instead (each month is comfortably under the ceiling for a single
      // year's worth of manga releases).
      console.log(`  -> year ${year} hit the ceiling, re-walking by month...`);
      for (let month = 1; month <= 12; month++) {
        const range = monthRange(year, month);
        await sleep(REQUEST_DELAY_MS);
        const monthResult = await walkRange(
          prisma,
          supabase.storage,
          range.gt,
          range.lt,
          `year ${year} month ${month}`,
          counters,
        );
        if (monthResult.hitCeiling) {
          console.log(
            `  ! year ${year} month ${month} ALSO hit the ceiling — some titles from this month may still be missing.`,
          );
        }
      }
    }

    console.log(
      `Year ${year} (${pageCount} page${pageCount === 1 ? "" : "s"}${hitCeiling ? ", month-split" : ""}) — running totals: created=${counters.created} updated=${counters.updated} skipped=${counters.skipped} failed=${counters.failed}`,
    );
    await sleep(REQUEST_DELAY_MS);
  }

  // Catch-all pass for titles with no publication date at all (the year
  // partitions above structurally can't reach these).
  console.log("\nUndated catch-all pass...");
  let page = 1;
  for (;;) {
    let data: { Page: { media: Media[] } };
    try {
      data = await anilistRequest<{ Page: { media: Media[] } }>(UNDATED_QUERY, { page });
    } catch (err) {
      console.log(
        `  ! undated pass page ${page} failed, stopping: ${err instanceof Error ? err.message : err}`,
      );
      break;
    }
    const mediaList = data.Page.media;
    if (mediaList.length === 0) break;

    await upsertMediaList(prisma, supabase.storage, mediaList, counters);
    if (mediaList.length < PER_PAGE || page >= PAGE_CAP_WARNING) break;

    page++;
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(
    `\nDone. Created ${counters.created}, updated ${counters.updated}, skipped ${counters.skipped} (non JP/KR/CN/TW), failed ${counters.failed}.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
