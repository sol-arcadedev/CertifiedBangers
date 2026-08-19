import "server-only";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";

// Free public GraphQL API, no key required (Entry 44). "MANGA" is
// AniList's media type covering manga/manhwa/manhua together, distinguished
// by countryOfOrigin — mapped to our TitleType below.
const ANILIST_ENDPOINT = "https://graphql.anilist.co";

async function anilistRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
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
  // Lets an unimported result link out to its real AniList page — there's
  // no local /titles/[id] to send it to yet, so "see more information"
  // means AniList's own page until/unless it gets imported.
  siteUrl: string | null;
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
        siteUrl
      }
    }
  }
`;

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
        siteUrl: string | null;
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
        siteUrl: m.siteUrl,
      };
    })
    .filter((m): m is AniListSearchResult => m !== null);
}

// Fields sourced straight from AniList with no manual-edit UI anywhere —
// safe for scripts/refresh-anilist-data.ts to overwrite periodically.
// synonyms is deliberately excluded: it's editable via the manual title
// form (repurposed from the old altNames field), so an auto-refresh could
// clobber an admin's correction the same way genres/synopsis are protected.
type AniListRefreshableFields = {
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  source: string | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  startMonth: number | null;
  startDay: number | null;
};

export type AniListTitleImport = AniListRefreshableFields & {
  anilistId: number;
  name: string;
  synonyms: string[];
  type: TitleType;
  status: TitleStatus;
  author: string | null;
  illustrator: string | null;
  genres: string[];
  synopsis: string | null;
  publicationYear: number | null;
  externalLinks: string[];
  coverImageUrl: string | null;
};

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

type DetailResponse = {
  Media: {
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
  } | null;
};

export async function getAniListMediaById(id: number): Promise<AniListTitleImport | null> {
  const data = await anilistRequest<DetailResponse>(
    `query ($id: Int) { Media(id: $id, type: MANGA) { ${DETAIL_FIELDS} } }`,
    { id },
  );

  const media = data.Media;
  if (!media) return null;

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

// Used by scripts/refresh-anilist-data.ts to re-fetch just the
// AniListRefreshableFields for an already-imported title.
export async function getAniListRefreshableFields(
  id: number,
): Promise<AniListRefreshableFields | null> {
  const data = await anilistRequest<{
    Media: {
      title: { romaji: string | null; english: string | null; native: string | null };
      startDate: { month: number | null; day: number | null };
      averageScore: number | null;
      meanScore: number | null;
      popularity: number | null;
      favourites: number | null;
      source: string | null;
    } | null;
  }>(
    `query ($id: Int) {
      Media(id: $id, type: MANGA) {
        title { romaji english native }
        startDate { month day }
        averageScore
        meanScore
        popularity
        favourites
        source
      }
    }`,
    { id },
  );

  const media = data.Media;
  if (!media) return null;

  return {
    titleRomaji: media.title.romaji,
    titleEnglish: media.title.english,
    titleNative: media.title.native,
    startMonth: media.startDate.month,
    startDay: media.startDate.day,
    averageScore: media.averageScore,
    meanScore: media.meanScore,
    popularity: media.popularity,
    favourites: media.favourites,
    source: media.source,
  };
}
