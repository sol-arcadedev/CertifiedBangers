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

// Reverse of mapCountryToTitleType, for filtering AniList's browse query
// by our Format dropdown. MANHUA maps to two AniList country codes (China
// and Taiwan) since our TitleType collapses both into one bucket — using
// countryOfOrigin_in (not the singular countryOfOrigin) means both are
// included rather than arbitrarily picking one and silently dropping the
// other.
function mapTitleTypeToCountryCodes(type: TitleType): string[] {
  switch (type) {
    case TitleType.MANGA:
      return ["JP"];
    case TitleType.MANHWA:
      return ["KR"];
    case TitleType.MANHUA:
      return ["CN", "TW"];
  }
}

// Reverse of mapAniListStatus, for filtering by our Status dropdown.
// ONGOING maps to both RELEASING and NOT_YET_RELEASED since
// mapAniListStatus's default case folds both of those into ONGOING —
// keeping the two directions symmetric.
function mapTitleStatusToAniListStatuses(status: TitleStatus): string[] {
  switch (status) {
    case TitleStatus.ONGOING:
      return ["RELEASING", "NOT_YET_RELEASED"];
    case TitleStatus.COMPLETED:
      return ["FINISHED"];
    case TitleStatus.HIATUS:
      return ["HIATUS"];
    case TitleStatus.DROPPED:
      return ["CANCELLED"];
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

// For /titles' "blend in AniList results" fallback — unlike
// searchAniListMedia (admin import search, text-only, small perPage),
// this also filters by genre so a genre-only browse (no search text)
// still reaches AniList, and returns a much larger page so "filter by
// Adventure" doesn't cap out at 10 results. Builds the query/variable
// list dynamically since GraphQL has no clean way to make an argument
// conditionally present — genre/search values are still always passed
// as variables, never string-interpolated, so this isn't an injection
// risk despite the dynamic query text.
export async function browseAniListMedia(filters: {
  search?: string;
  genre?: string;
  type?: TitleType;
  status?: TitleStatus;
  perPage?: number;
}): Promise<AniListSearchResult[]> {
  const args = ["type: MANGA", "format_in: [MANGA, ONE_SHOT]"];
  const variableDefs = ["$perPage: Int"];
  const variables: Record<string, unknown> = { perPage: filters.perPage ?? 30 };

  if (filters.search) {
    variableDefs.push("$search: String");
    args.push("search: $search");
    variables.search = filters.search;
  }
  if (filters.genre) {
    variableDefs.push("$genre: String");
    args.push("genre_in: [$genre]");
    variables.genre = filters.genre;
  }
  if (filters.type) {
    variableDefs.push("$countries: [CountryCode]");
    args.push("countryOfOrigin_in: $countries");
    variables.countries = mapTitleTypeToCountryCodes(filters.type);
  }
  if (filters.status) {
    variableDefs.push("$statuses: [MediaStatus]");
    args.push("status_in: $statuses");
    variables.statuses = mapTitleStatusToAniListStatuses(filters.status);
  }
  args.push(filters.search ? "sort: SEARCH_MATCH" : "sort: POPULARITY_DESC");

  const query = `
    query(${variableDefs.join(", ")}) {
      Page(page: 1, perPage: $perPage) {
        media(${args.join(", ")}) {
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
  }>(query, variables, DISPLAY_CACHE_SECONDS);

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

// Batch equivalent for list views (browse grids, homepage sorts, admin
// list) — Entry 52. One AniList request per call regardless of how many
// ids are requested (chunked at AniList's perPage ceiling), so a page
// showing N imported titles costs one round trip, not N — required to
// stay under AniList's public 30 req/min rate limit under real traffic.
// Always cached: every caller is a display list, never a write path.
const ANILIST_BATCH_SIZE = 50;

export async function getAniListMediaByIds(
  ids: number[],
): Promise<Map<number, AniListTitleImport>> {
  const result = new Map<number, AniListTitleImport>();
  if (ids.length === 0) return result;

  for (let i = 0; i < ids.length; i += ANILIST_BATCH_SIZE) {
    const chunk = ids.slice(i, i + ANILIST_BATCH_SIZE);
    const data = await anilistRequest<{ Page: { media: MediaDetailItem[] } }>(
      `query ($ids: [Int]) {
        Page(page: 1, perPage: ${ANILIST_BATCH_SIZE}) {
          media(id_in: $ids, type: MANGA) { ${DETAIL_FIELDS} }
        }
      }`,
      { ids: chunk },
      DISPLAY_CACHE_SECONDS,
    );

    for (const media of data.Page.media) {
      const mapped = mapMediaToImport(media);
      if (mapped) result.set(media.id, mapped);
    }
  }

  return result;
}

// AniList's canonical genre list — feeds the genre filter dropdown
// (src/lib/genres.ts) instead of a local `SELECT DISTINCT unnest(genres)`,
// since genres are no longer stored locally for AniList-linked titles
// (Entry 52). Cached like every other display-oriented call.
export async function getAniListGenreCollection(): Promise<string[]> {
  const data = await anilistRequest<{ GenreCollection: string[] }>(
    `query { GenreCollection }`,
    {},
    DISPLAY_CACHE_SECONDS,
  );
  return data.GenreCollection;
}
