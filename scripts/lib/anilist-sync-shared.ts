// Shared helpers for scripts/mirror-anilist-catalog.ts and
// scripts/refresh-anilist-catalog.ts. Plain script-to-script import (no
// "server-only" issue, unlike src/lib/anilist.ts/cover-storage.ts) — kept
// under scripts/ specifically so it's never reachable from the Next.js app.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Narrowed to just the Storage sub-client (all this needs) rather than the
// full SupabaseClient — the full client's type is generically parameterized
// over the DB schema, and two separately-called createClient() instances
// (one per script) don't always structurally unify across a module
// boundary; .storage sidesteps that entirely.
type SupabaseStorageClient = ReturnType<typeof createClient>["storage"];

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";
export const COVER_BUCKET = "covers";
// ~27 req/min, safely under AniList's confirmed 30 req/min public limit.
export const REQUEST_DELAY_MS = 2200;
export const COVER_CONCURRENCY = 8;
export const MAX_RETRIES = 3;

export type StaffEdge = { role: string; node: { name: { full: string } } };
export type Media = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  synonyms: (string | null)[] | null;
  countryOfOrigin: string;
  status: string;
  startDate: { year: number | null; month: number | null; day: number | null };
  genres: string[];
  description: string | null;
  coverImage: { large: string | null };
  siteUrl: string | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  source: string | null;
  staff: { edges: StaffEdge[] };
};

export const MEDIA_DETAIL_FIELDS = `
  id
  title { romaji english native }
  synonyms
  countryOfOrigin
  status
  startDate { year month day }
  genres
  description(asHtml: false)
  coverImage { large }
  siteUrl
  averageScore
  meanScore
  popularity
  favourites
  source
  staff(perPage: 6) { edges { role node { name { full } } } }
`;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mapCountryToTitleType(country: string): "MANGA" | "MANHWA" | "MANHUA" | null {
  switch (country) {
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

export function mapAniListStatus(status: string): "ONGOING" | "COMPLETED" | "HIATUS" | "DROPPED" {
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

// AniList's `description(asHtml: false)` only controls whether <br> becomes
// a real line break — it does NOT strip other inline formatting tags (<b>,
// <i>, <a>, etc.), which come through as literal text otherwise. Kept as an
// inline duplicate of src/lib/strip-html.ts's logic rather than a shared
// import, per this file's own scripts/-only boundary (see file header).
function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function deriveCredits(edges: StaffEdge[]) {
  let author: string | null = null;
  let illustrator: string | null = null;
  for (const edge of edges) {
    const role = edge.role.toLowerCase();
    const name = edge.node.name.full;
    if (role.includes("story")) author ??= name;
    if (role.includes("art")) illustrator ??= name;
  }
  return { author, illustrator };
}

// Shared local-column shape both scripts write, derived from an AniList
// Media item — everything except `coverUrl`, which each caller resolves
// separately (create-vs-skip-if-present differs slightly between the
// initial mirror and the recurring refresh).
export function mediaToTitleData(media: Media) {
  const type = mapCountryToTitleType(media.countryOfOrigin);
  if (!type) return null;

  const { author, illustrator } = deriveCredits(media.staff.edges);

  return {
    type,
    name: media.title.english ?? media.title.romaji ?? "Untitled",
    titleRomaji: media.title.romaji,
    titleEnglish: media.title.english,
    titleNative: media.title.native,
    synonyms: (media.synonyms ?? []).filter((s): s is string => !!s),
    status: mapAniListStatus(media.status),
    author,
    illustrator,
    genres: media.genres,
    synopsis: media.description ? stripHtml(media.description) : null,
    publicationYear: media.startDate.year,
    startMonth: media.startDate.month,
    startDay: media.startDate.day,
    externalLinks: media.siteUrl ? [media.siteUrl] : [],
    anilistAverageScore: media.averageScore,
    anilistMeanScore: media.meanScore,
    anilistPopularity: media.popularity,
    anilistFavourites: media.favourites,
    anilistSource: media.source,
  };
}

export async function anilistRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.data) return json.data as T;
    console.log(`  ! request failed (attempt ${attempt}/${MAX_RETRIES}), status ${res.status} — retrying`);
    await sleep(REQUEST_DELAY_MS * attempt * 2);
  }
  throw new Error(`AniList request failed after ${MAX_RETRIES} retries.`);
}

export async function downloadAndUploadCover(
  storage: SupabaseStorageClient,
  url: string,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = url.split(".").pop()?.split(/[?#]/)[0]?.toLowerCase() || "jpg";
    const path = `${randomUUID()}.${ext}`;
    const { error } = await storage.from(COVER_BUCKET).upload(path, buffer, {
      contentType: res.headers.get("content-type") || "image/jpeg",
    });
    if (error) return null;
    return storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

// Bounded-concurrency map — cover downloads are the dominant cost (not
// AniList-GraphQL-rate-limited, unlike the page/batch fetches), so this is
// what keeps a full run to hours instead of days.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
