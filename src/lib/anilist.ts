import "server-only";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";

// Free public GraphQL API, no key required (Entry 44). "MANGA" is
// AniList's media type covering manga/manhwa/manhua together, distinguished
// by countryOfOrigin — mapped to our TitleType below.
const ANILIST_ENDPOINT = "https://graphql.anilist.co";

// revalidateSeconds is only passed by display-oriented callers (title
// pages, browse/homepage listings, the genre dropdown) — Entry 52's live
// data model means these run on essentially every page view, and AniList's
// public API is rate-limited to 30 req/min, so they opt into Next's fetch
// cache. Admin one-off actions (search-to-import, the dedupe check) omit
// it, since up-to-the-minute freshness matters more there than cache economy.
async function anilistRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  revalidateSeconds?: number,
): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    ...(revalidateSeconds ? { next: { revalidate: revalidateSeconds } } : {}),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    throw new Error(`AniList request failed (${res.status}).`);
  }
  if (json.errors?.length) {
    throw new Error(`AniList error: ${json.errors[0]?.message ?? "unknown"}`);
  }
  return json.data as T;
}

// How long display-oriented AniList data is trusted before Next re-fetches
// it (Entry 52). Long enough to comfortably stay under the 30 req/min
// public rate limit under real traffic; short enough that "stale for
// months" (the bug this replaced) can't happen again.
const DISPLAY_CACHE_SECONDS = 3600;

function mapCountryToTitleType(countryOfOrigin: string): TitleType | null {
  switch (countryOfOrigin) {
    case "JP":
      return TitleType.MANGA;
    case "KR":
      return TitleType.MANHWA;
    case "CN":
    case "TW":
      return TitleType.MANHUA;
    default:
      return null;
  }
}

function mapAniListStatus(status: string): TitleStatus {
  switch (status) {
    case "FINISHED":
      return TitleStatus.COMPLETED;
    case "HIATUS":
      return TitleStatus.HIATUS;
    case "CANCELLED":
      return TitleStatus.DROPPED;
    case "RELEASING":
    case "NOT_YET_RELEASED":
    default:
      return TitleStatus.ONGOING;
  }
}

type StaffEdge = { role: string; node: { name: { full: string } } };

function deriveCredits(edges: StaffEdge[]) {
  let author: string | null = null;
  let illustrator: string | null = null;
  for (const edge of edges) {
    const role = edge.role.toLowerCase();
    const name = edge.node.name.full;
    const isStory = role.includes("story");
    const isArt = role.includes("art");
    if (isStory) author ??= name;
    if (isArt) illustrator ??= name;
  }
  return { author, illustrator };
}

export type AniListSearchResult = {
  anilistId: number;
  name: string;
  type: TitleType;
  publicationYear: number | null;
  coverImageUrl: string | null;
  averageScore: number | null;
  popularity: number | null;
};

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: MANGA, format_in: [MANGA, ONE_SHOT], sort: SEARCH_MATCH) {
        id
        title { romaji english }
        countryOfOrigin
        startDate { year }
        coverImage { medium }
        averageScore
        popularity
      }
    }
  }
`;

// Admin import search — deliberately uncached, freshest possible results
// when an admin is actively deciding what to import.
export async function searchAniListMedia(query: string): Promise<AniListSearchResult[]> {
  const data = await anilistRequest<{
    Page: {
      media: {
        id: number;
        title: { romaji: string | null; english: string | null };
        countryOfOrigin: string;
        startDate: { year: number | null };
        coverImage: { medium: string | null };
        averageScore: number | null;
        popularity: number | null;
      }[];
    };
  }>(SEARCH_QUERY, { search: query });

  return data.Page.media
    .map((m) => {
      const type = mapCountryToTitleType(m.countryOfOrigin);
      if (!type) return null;
      return {
        anilistId: m.id,
        name: m.title.english ?? m.title.romaji ?? "Untitled",
        type,
        publicationYear: m.startDate.year,
        coverImageUrl: m.coverImage.medium,
        averageScore: m.averageScore,
        popularity: m.popularity,
      };
    })
    .filter((m): m is AniListSearchResult => m !== null);
}

export type AniListTitleImport = {
  anilistId: number;
  name: string;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  synonyms: string[];
  type: TitleType;
  status: TitleStatus;
  author: string | null;
  illustrator: string | null;
  genres: string[];
  synopsis: string | null;
  publicationYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  externalLinks: string[];
  coverImageUrl: string | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  source: string | null;
};

// Shared by getAniListMediaById (single) and getAniListMediaByIds (batch,
// Entry 52) — same field set, same shape-to-AniListTitleImport mapping,
// just queried one-at-a-time vs. via id_in.
const DETAIL_FIELDS = `
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
  staff(perPage: 6) {
    edges { role node { name { full } } }
  }
`;

type MediaDetailItem = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  // AniList's synonyms field is a nullable list of nullable strings — it
  // has genuinely come back as null for real titles, not just [].
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

function mapMediaToImport(media: MediaDetailItem): AniListTitleImport | null {
  const type = mapCountryToTitleType(media.countryOfOrigin);
  if (!type) return null;

  const name = media.title.english ?? media.title.romaji ?? "Untitled";
  const { author, illustrator } = deriveCredits(media.staff.edges);

  return {
    anilistId: media.id,
    name,
    titleRomaji: media.title.romaji,
    titleEnglish: media.title.english,
    titleNative: media.title.native,
    synonyms: (media.synonyms ?? []).filter((s): s is string => !!s),
    type,
    status: mapAniListStatus(media.status),
    author,
    illustrator,
    genres: media.genres,
    synopsis: media.description ? media.description.replace(/<br\s*\/?>/gi, "\n").trim() : null,
    publicationYear: media.startDate.year,
    startMonth: media.startDate.month,
    startDay: media.startDate.day,
    externalLinks: media.siteUrl ? [media.siteUrl] : [],
    coverImageUrl: media.coverImage.large,
    averageScore: media.averageScore,
    meanScore: media.meanScore,
    popularity: media.popularity,
    favourites: media.favourites,
    source: media.source,
  };
}

// cache: true for display-oriented callers (title pages) — Entry 52. false
// for performAniListImport, which wants the freshest possible snapshot at
// the moment an admin/user actually imports a title.
export async function getAniListMediaById(
  id: number,
  cache = false,
): Promise<AniListTitleImport | null> {
  const data = await anilistRequest<{ Media: MediaDetailItem | null }>(
    `query ($id: Int) { Media(id: $id, type: MANGA) { ${DETAIL_FIELDS} } }`,
    { id },
    cache ? DISPLAY_CACHE_SECONDS : undefined,
  );

  const media = data.Media;
  if (!media) return null;
  return mapMediaToImport(media);
}
