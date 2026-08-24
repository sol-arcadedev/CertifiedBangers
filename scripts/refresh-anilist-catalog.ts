// The recurring job (Journal Entry 56, run daily via
// .github/workflows/refresh-anilist-catalog.yml): re-fetches current
// metadata for every already-mirrored title (batched, 50/request) and
// discovers newly-added AniList titles since the last run. This is what
// replaces the old manual refresh-anilist-data.ts script (deleted in
// Entry 52) — the difference this time is it's actually run on a
// schedule, not something someone has to remember to run.
//
// Run with: npx tsx scripts/refresh-anilist-catalog.ts
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

const BATCH_SIZE = 50;
// How many of AniList's newest entries (by id, descending) to check for
// titles added since the last run. Generous enough to not miss a day's
// worth of new releases even on a busy day.
const DISCOVER_NEWEST_COUNT = 300;

const BATCH_QUERY = `
  query ($ids: [Int]) {
    Page(page: 1, perPage: ${BATCH_SIZE}) {
      media(id_in: $ids, type: MANGA) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  }
`;

const NEWEST_QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: ${BATCH_SIZE}) {
      media(type: MANGA, format_in: [MANGA, ONE_SHOT], sort: ID_DESC) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  }
`;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // --- Pass 1: refresh every already-mirrored title's metadata ---
  const existing = await prisma.title.findMany({
    where: { anilistId: { not: null } },
    select: { id: true, anilistId: true, coverUrl: true },
  });
  console.log(`Refreshing ${existing.length} already-mirrored titles...`);

  let refreshed = 0;
  let failed = 0;
  let gone = 0;

  for (let i = 0; i < existing.length; i += BATCH_SIZE) {
    const batch = existing.slice(i, i + BATCH_SIZE);
    const ids = batch.map((t) => t.anilistId!);
    const byAnilistId = new Map(batch.map((t) => [t.anilistId, t]));

    try {
      const data = await anilistRequest<{ Page: { media: Media[] } }>(BATCH_QUERY, { ids });
      const returnedIds = new Set(data.Page.media.map((m) => m.id));

      await mapWithConcurrency(data.Page.media, COVER_CONCURRENCY, async (media) => {
        try {
          const titleData = mediaToTitleData(media);
          if (!titleData) return;
          const row = byAnilistId.get(media.id)!;
          const coverUrl =
            row.coverUrl ?? (await downloadAndUploadCover(supabase.storage, media.coverImage.large ?? ""));
          await prisma.title.update({ where: { id: row.id }, data: { ...titleData, coverUrl } });
          refreshed++;
        } catch (err) {
          failed++;
          console.log(`  x anilistId=${media.id} failed: ${err instanceof Error ? err.message : err}`);
        }
      });

      // AniList removes/merges media occasionally — a title in our batch
      // that didn't come back just keeps its last-known local data rather
      // than being touched; flagged here for visibility only.
      for (const id of ids) {
        if (!returnedIds.has(id)) gone++;
      }
    } catch (err) {
      failed += batch.length;
      console.log(`  x batch starting at index ${i} failed: ${err instanceof Error ? err.message : err}`);
    }

    console.log(`  ...${Math.min(i + BATCH_SIZE, existing.length)}/${existing.length} (refreshed=${refreshed} failed=${failed} gone=${gone})`);
    await sleep(REQUEST_DELAY_MS);
  }

  // --- Pass 2: discover newly-added AniList titles ---
  console.log(`\nChecking AniList's newest ${DISCOVER_NEWEST_COUNT} entries for anything new...`);
  const localAnilistIds = new Set(existing.map((t) => t.anilistId));
  let discovered = 0;
  let page = 1;

  while ((page - 1) * BATCH_SIZE < DISCOVER_NEWEST_COUNT) {
    const data = await anilistRequest<{ Page: { media: Media[] } }>(NEWEST_QUERY, { page });
    if (data.Page.media.length === 0) break;

    for (const media of data.Page.media) {
      if (localAnilistIds.has(media.id)) continue;
      const titleData = mediaToTitleData(media);
      if (!titleData) continue;

      try {
        const coverUrl = await downloadAndUploadCover(supabase.storage, media.coverImage.large ?? "");
        await prisma.title.create({ data: { anilistId: media.id, ...titleData, coverUrl } });
        discovered++;
      } catch (err) {
        console.log(`  x new anilistId=${media.id} failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    page++;
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\nDone. Refreshed ${refreshed}, discovered ${discovered} new titles, ${failed} failed, ${gone} no longer returned by AniList.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
