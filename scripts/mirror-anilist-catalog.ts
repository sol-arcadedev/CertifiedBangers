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
        await prisma.title.create({ data: { anilistId: media.id, ...titleData, coverUrl } });
        counters.created++;
      }
    } catch (err) {
      counters.failed++;
      console.log(`  x anilistId=${media.id} failed: ${err instanceof Error ? err.message : err}`);
    }
  });
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
  // START_YEAR lets a re-run skip years already mirrored in a prior
  // (e.g. interrupted) pass instead of re-walking the whole catalog.
  const startYear = process.env.START_YEAR ? Number(process.env.START_YEAR) : 1900;
  const years = Array.from(
    { length: currentYear + 1 - startYear + 1 },
    (_, i) => startYear + i,
  );

  for (const year of years) {
    const gt = Number(`${year - 1}1231`); // strictly after Dec 31 of the prior year
    const lt = Number(`${year + 1}0101`); // strictly before Jan 1 of the next year

    let page = 1;
    let pageCount = 0;
    for (;;) {
      const data = await anilistRequest<{ Page: { media: Media[] } }>(YEAR_QUERY, { page, gt, lt });
      const mediaList = data.Page.media;
      if (mediaList.length === 0) break;

      await upsertMediaList(prisma, supabase.storage, mediaList, counters);
      pageCount = page;
      if (mediaList.length < PER_PAGE) break; // last (partial) page for this year

      page++;
      await sleep(REQUEST_DELAY_MS);
    }

    if (pageCount >= PAGE_CAP_WARNING) {
      console.log(
        `  ! WARNING: year ${year} hit the ${PAGE_CAP_WARNING}-page ceiling — it may have more titles than this run reached. Consider a month-level sub-partition for this year.`,
      );
    }

    console.log(
      `Year ${year} (${pageCount} page${pageCount === 1 ? "" : "s"}) — running totals: created=${counters.created} updated=${counters.updated} skipped=${counters.skipped} failed=${counters.failed}`,
    );
    await sleep(REQUEST_DELAY_MS);
  }

  // Catch-all pass for titles with no publication date at all (the year
  // partitions above structurally can't reach these).
  console.log("\nUndated catch-all pass...");
  let page = 1;
  for (;;) {
    const data = await anilistRequest<{ Page: { media: Media[] } }>(UNDATED_QUERY, { page });
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
