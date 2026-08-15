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
      };
    })
    .filter((m): m is AniListSearchResult => m !== null);
}

export type AniListTitleImport = {
  anilistId: number;
  name: string;
  altNames: string[];
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

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english native }
      synonyms
      countryOfOrigin
      status
      startDate { year }
      genres
      description(asHtml: false)
      coverImage { large }
      siteUrl
      staff(perPage: 6) {
        edges { role node { name { full } } }
      }
    }
  }
`;

export async function getAniListMediaById(id: number): Promise<AniListTitleImport | null> {
  const data = await anilistRequest<{
    Media: {
      id: number;
      title: { romaji: string | null; english: string | null; native: string | null };
      synonyms: string[];
      countryOfOrigin: string;
      status: string;
      startDate: { year: number | null };
      genres: string[];
      description: string | null;
      coverImage: { large: string | null };
      siteUrl: string | null;
      staff: { edges: StaffEdge[] };
    } | null;
  }>(DETAIL_QUERY, { id });

  const media = data.Media;
  if (!media) return null;

  const type = mapCountryToTitleType(media.countryOfOrigin);
  if (!type) return null;

  const name = media.title.english ?? media.title.romaji ?? "Untitled";
  const altNames = [media.title.romaji, media.title.native, ...media.synonyms].filter(
    (n): n is string => !!n && n !== name,
  );
  const { author, illustrator } = deriveCredits(media.staff.edges);

  return {
    anilistId: media.id,
    name,
    altNames,
    type,
    status: mapAniListStatus(media.status),
    author,
    illustrator,
    genres: media.genres,
    synopsis: media.description ? media.description.replace(/<br\s*\/?>/gi, "\n").trim() : null,
    publicationYear: media.startDate.year,
    externalLinks: media.siteUrl ? [media.siteUrl] : [],
    coverImageUrl: media.coverImage.large,
  };
}
