import { Type, type FunctionDeclaration } from "@google/genai";
import { prisma } from "@/lib/prisma";

const EXCERPT_LENGTH = 200;

export type RecommendedTitle = {
  id: string;
  name: string;
  type: string;
  genres: string[];
  coverUrl: string | null;
  communityScore: number | null;
  certifiedBangerCount: number;
  reviewExcerpts: { username: string; score: number | null; excerpt: string }[];
};

// The tool's real implementation — grounded in this site's own reviews
// (reviewCount > 0), never the raw AniList mirror, and excludes a logged-in
// user's own library server-side so it can't be spoofed by the model.
export async function recommendTitles(
  genres: string[],
  userId: string | null,
  limit = 5,
): Promise<RecommendedTitle[]> {
  const clampedLimit = Math.min(Math.max(limit, 1), 8);

  const titles = await prisma.title.findMany({
    where: {
      reviewCount: { gt: 0 },
      ...(genres.length > 0 ? { genres: { hasSome: genres } } : {}),
      ...(userId ? { libraryEntries: { none: { userId } } } : {}),
    },
    orderBy: [
      { certifiedBangerCount: "desc" },
      { communityScore: { sort: "desc", nulls: "last" } },
      { reviewCount: "desc" },
    ],
    take: clampedLimit,
    select: {
      id: true,
      name: true,
      type: true,
      genres: true,
      coverUrl: true,
      communityScore: true,
      certifiedBangerCount: true,
      reviews: {
        where: { approvalStatus: "PUBLISHED" },
        take: 2,
        select: { overallScore: true, bodyText: true, user: { select: { username: true } } },
      },
    },
  });

  return titles.map((title) => ({
    id: title.id,
    name: title.name,
    type: title.type,
    genres: title.genres,
    coverUrl: title.coverUrl,
    communityScore: title.communityScore,
    certifiedBangerCount: title.certifiedBangerCount,
    reviewExcerpts: title.reviews.map((review) => ({
      username: review.user.username,
      score: review.overallScore,
      excerpt:
        review.bodyText.length > EXCERPT_LENGTH
          ? `${review.bodyText.slice(0, EXCERPT_LENGTH)}…`
          : review.bodyText,
    })),
  }));
}

export const recommendTitlesDeclaration: FunctionDeclaration = {
  name: "recommend_titles",
  description:
    "Recommend manga/manhwa/manhua titles from CertifiedBanger's own catalog, matching one or more genres. Only returns titles that have real community reviews on this site. Never invent a title that isn't in the returned list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      genres: {
        type: Type.ARRAY,
        description:
          "Genres to match, from the site's known genre list given in the system instructions. Leave empty for general top picks with no genre filter.",
        items: { type: Type.STRING },
      },
      limit: {
        type: Type.INTEGER,
        description: "How many titles to return. Defaults to 5, max 8.",
      },
    },
    required: ["genres"],
  },
};
