import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAniListMediaById } from "@/lib/anilist";
import { checkReviewGate } from "@/lib/review-gate";
import { submitReviewForAniListTitle } from "@/lib/actions/reviews";
import { ReviewForm } from "@/components/review-form";
import { AniListLibraryWidget } from "@/components/anilist-library-widget";
import { formatStartDate, formatSource } from "@/lib/title-format";
import { BUTTON_PRIMARY, LINK, CARD } from "@/lib/ui-classes";

// A dedicated page for any AniList title, whether or not it's been
// imported into our catalog yet — reachable from /titles' "Found on
// AniList" fallback. Mirrors the real /titles/[id] page's layout, and —
// per the site's community-driven vision — anyone signed in can write a
// review or add it to their library right here; doing either imports the
// title on the fly (submitReviewForAniListTitle / setLibraryStatusForAniListTitle),
// gated by the same review rules that already apply everywhere else
// (email-verified, 3+ day account age, rate limits), not an admin's
// separate say-so.
export default async function AniListTitlePreviewPage(
  props: PageProps<"/titles/anilist/[anilistId]">,
) {
  const { anilistId: anilistIdParam } = await props.params;
  const anilistId = Number(anilistIdParam);
  if (!Number.isInteger(anilistId)) notFound();

  // Already in our catalog — send to the real page rather than showing a
  // second, thinner version of it.
  const existing = await prisma.title.findUnique({ where: { anilistId } });
  if (existing) redirect(`/titles/${existing.id}`);

  // getAniListMediaById throws (not just returns null) for a nonexistent
  // id — AniList's API responds 404 for those, which anilistRequest
  // surfaces as a thrown Error rather than null data.
  const [media, user] = await Promise.all([
    getAniListMediaById(anilistId, true).catch(() => null),
    getCurrentUser(),
  ]);
  if (!media) notFound();

  const [categories, gate] = await Promise.all([
    prisma.category.findMany({ where: { appliesToType: { has: media.type } }, orderBy: { name: "asc" } }),
    user ? checkReviewGate(user.id, user.createdAt) : Promise.resolve({ allowed: true as const }),
  ]);

  const details: { label: string; value: string }[] = [
    { label: "Status", value: media.status },
    { label: "Start Date", value: formatStartDate(media.publicationYear, media.startMonth, media.startDay) },
    { label: "Average Score", value: media.averageScore !== null ? `${media.averageScore}%` : null },
    { label: "Mean Score", value: media.meanScore !== null ? `${media.meanScore}%` : null },
    { label: "Popularity", value: media.popularity?.toLocaleString() ?? null },
    { label: "Favorites", value: media.favourites?.toLocaleString() ?? null },
    { label: "Source", value: formatSource(media.source) },
    { label: "Genres", value: media.genres.length > 0 ? media.genres.join(", ") : null },
    { label: "Romaji", value: media.titleRomaji },
    { label: "English", value: media.titleEnglish },
    { label: "Native", value: media.titleNative },
    { label: "Synonyms", value: media.synonyms.length > 0 ? media.synonyms.join(", ") : null },
  ].filter((d): d is { label: string; value: string } => !!d.value);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {media.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.coverImageUrl}
            alt={media.name}
            className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-lg shadow-black/30"
          />
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{media.name}</h1>
          <p className="text-sm text-muted">
            {media.type} · {media.status}
            {media.publicationYear ? ` · ${media.publicationYear}` : ""}
          </p>
          {media.author && (
            <p className="mt-2 text-sm text-muted">
              By {media.author}
              {media.illustrator ? ` (art: ${media.illustrator})` : ""}
            </p>
          )}
          {media.synopsis && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/90">
              {media.synopsis}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="#review" className={BUTTON_PRIMARY}>
              Write a review
            </Link>
            {user && <AniListLibraryWidget anilistId={anilistId} />}
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        Not in our catalog yet — no reviews here so far. Be the first.
      </p>

      {details.length > 0 && (
        <div className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-4 ${CARD} p-4 sm:grid-cols-3`}>
          {details.map((d) => (
            <div key={d.label}>
              <div className="text-xs font-medium text-muted">{d.label}</div>
              <div className="text-sm text-foreground">{d.value}</div>
            </div>
          ))}
        </div>
      )}

      <div id="review" className="mt-10 scroll-mt-6 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground">Write a review</h2>
        {user && !gate.allowed && <p className="mt-2 text-sm text-amber-400">{gate.reason}</p>}
        {user ? (
          gate.allowed && (
            <div className="mt-4">
              <ReviewForm
                action={submitReviewForAniListTitle.bind(null, anilistId)}
                categories={categories}
              />
            </div>
          )
        ) : (
          <p className="mt-2 text-sm text-muted">
            <Link href="/login" className={LINK}>
              Log in
            </Link>{" "}
            to write a review — doing so adds this title to our catalog.
          </p>
        )}
      </div>
    </div>
  );
}
