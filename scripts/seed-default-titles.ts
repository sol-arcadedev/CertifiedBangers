// Populates the catalog with a curated set of well-known titles imported
// from AniList (Entry 44), so the site isn't empty by default. Safe to
// re-run — skips anything already imported (matched by anilistId).
//
// Self-contained rather than importing src/lib/anilist.ts or
// src/lib/cover-storage.ts: those files `import "server-only"`, which
// throws unconditionally under plain Node/tsx (it relies on bundler
// export conditions that only Next's own build understands) — same
// reason prisma/seed.ts doesn't import from src/lib either.
//
// Run with: npm run seed:titles
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const DEFAULT_TITLES = [
  // Manga (Japan)
  "One Piece",
  "Naruto",
  "Attack on Titan",
  "Jujutsu Kaisen",
  "Chainsaw Man",
  "Vagabond",
  // Manhwa (Korea)
  "Solo Leveling",
  "Tower of God",
  "The Beginning After the End",
  "Omniscient Reader's Viewpoint",
  // Manhua (China/Taiwan)
  "Tales of Demons and Gods",
  "The Daily Life of the Immortal King",
  "Battle Through the Heavens",
];

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const COVER_BUCKET = "covers";

async function anilistRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(`AniList request failed (${res.status}).`);
  if (json.errors?.length) throw new Error(`AniList error: ${json.errors[0]?.message ?? "unknown"}`);
  return json.data as T;
}

function mapCountryToTitleType(countryOfOrigin: string): "MANGA" | "MANHWA" | "MANHUA" | null {
  switch (countryOfOrigin) {
    case "JP":
      return "MANGA";
    case "KR":
      return "MANHWA";
    case "CN":
    case "TW":
      return "MANHUA";
    default:
      return null;
  }
}

function mapAniListStatus(status: string): "ONGOING" | "COMPLETED" | "HIATUS" | "DROPPED" {
  switch (status) {
    case "FINISHED":
      return "COMPLETED";
    case "HIATUS":
      return "HIATUS";
    case "CANCELLED":
      return "DROPPED";
    default:
      return "ONGOING";
  }
}

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: MANGA, format_in: [MANGA, ONE_SHOT], sort: SEARCH_MATCH) {
        id
        countryOfOrigin
      }
    }
  }
`;

// Entry 52: only `name`/`type`/`status`/cover are ever written locally
// (type is a deliberate permanent exception; name/status are a
// graceful-degrade fallback for when AniList is unreachable at render
// time) — everything else is fetched live on every render, never stored.
const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english }
      countryOfOrigin
      status
      coverImage { large }
    }
  }
`;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of DEFAULT_TITLES) {
    try {
      const searchData = await anilistRequest<{
        Page: { media: { id: number; countryOfOrigin: string }[] };
      }>(SEARCH_QUERY, { search: name });
      const best = searchData.Page.media.find((m) => mapCountryToTitleType(m.countryOfOrigin));
      if (!best) {
        console.log(`  x no usable AniList match for "${name}"`);
        failed++;
        continue;
      }

      const existing = await prisma.title.findUnique({ where: { anilistId: best.id } });
      if (existing) {
        console.log(`  . already imported: ${name}`);
        skipped++;
        continue;
      }

      const detailData = await anilistRequest<{
        Media: {
          id: number;
          title: { romaji: string | null; english: string | null };
          countryOfOrigin: string;
          status: string;
          coverImage: { large: string | null };
        } | null;
      }>(DETAIL_QUERY, { id: best.id });
      const media = detailData.Media;
      const type = media && mapCountryToTitleType(media.countryOfOrigin);
      if (!media || !type) {
        console.log(`  x detail fetch failed for "${name}"`);
        failed++;
        continue;
      }

      const titleName = media.title.english ?? media.title.romaji ?? name;

      let coverUrl: string | null = null;
      if (media.coverImage.large) {
        const res = await fetch(media.coverImage.large);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const ext =
            media.coverImage.large.split(".").pop()?.split(/[?#]/)[0]?.toLowerCase() || "jpg";
          const path = `${randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, buffer, {
            contentType: res.headers.get("content-type") || "image/jpeg",
          });
          if (!error) {
            coverUrl = supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
          }
        }
      }

      await prisma.title.create({
        data: {
          anilistId: media.id,
          name: titleName,
          type,
          status: mapAniListStatus(media.status),
          coverUrl,
        },
      });
      console.log(`  + imported: ${titleName}`);
      imported++;
    } catch (err) {
      console.log(`  x failed on "${name}": ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    await sleep(500); // be a good AniList API citizen
  }

  console.log(`\nDone. Imported ${imported}, skipped ${skipped} already-imported, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
