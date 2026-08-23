import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAniListMediaById } from "@/lib/anilist";
import { checkReviewGate } from "@/lib/review-gate";
import { submitReview } from "@/lib/actions/reviews";
import { ReviewForm } from "@/components/review-form";
import { UsernameLabel } from "@/components/username-label";
import { VoteButtons } from "@/components/vote-buttons";
import { CommentForm } from "@/components/comment-form";
import { ReportButton } from "@/components/report-button";
import { LibraryWidget } from "@/components/library-widget";
import { formatStartDate, formatSource } from "@/lib/title-format";
import { BUTTON_PRIMARY, LINK, CARD } from "@/lib/ui-classes";
import type { LibraryStatus } from "@/generated/prisma/enums";

const LIBRARY_STATUS_DISPLAY: { status: LibraryStatus; label: string; emoji: string }[] = [
  { status: "CURRENTLY_READING", label: "Currently Reading", emoji: "📖" },
  { status: "FINISHED", label: "Finished", emoji: "✅" },
  { status: "PLAN_TO_READ", label: "Plan to Read", emoji: "📋" },
  { status: "DROPPED", label: "Dropped", emoji: "❌" },
];

// Entry 52: for an AniList-linked title, every detail field below except
// `type`/`coverUrl` (kept locally by design) is resolved live rather than
// from the local row, which no longer carries a trustworthy copy of them.
// Falls back to the local `name`/`status` snapshot (written once at
// import, Entry 52) if AniList itself is slow/unreachable — a real
// (if possibly slightly stale) name/status beats a generic placeholder,
// and this title's reviews/aggregate score are real local content that
// must stay visible regardless of AniList's uptime.
async function resolveTitleDisplay(title: {
  anilistId: number | null;
  name: string;
  status: string;
  genres: string[];
  synopsis: string | null;
  author: string | null;
  illustrator: string | null;
  publicationYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  synonyms: string[];
  anilistAverageScore: number | null;
  anilistMeanScore: number | null;
  anilistPopularity: number | null;
  anilistFavourites: number | null;
  anilistSource: string | null;
}) {
  if (title.anilistId === null) {
    // Manual title (Entry 44's fallback path) — no AniList source, local
    // columns are the only data that has ever existed for it.
    return { ...title, liveDataUnavailable: false };
  }

  const live = await getAniListMediaById(title.anilistId, true).catch(() => null);
  if (!live) {
    return {
      ...title,
      genres: [],
      synopsis: null,
      author: null,
      illustrator: null,
      publicationYear: null,
      startMonth: null,
      startDay: null,
      titleRomaji: null,
      titleEnglish: null,
      titleNative: null,
      synonyms: [],
      anilistAverageScore: null,
      anilistMeanScore: null,
      anilistPopularity: null,
      anilistFavourites: null,
      anilistSource: null,
      liveDataUnavailable: true,
    };
  }

  return {
    name: live.name,
    status: live.status,
    genres: live.genres,
    synopsis: live.synopsis,
    author: live.author,
    illustrator: live.illustrator,
    publicationYear: live.publicationYear,
    startMonth: live.startMonth,
    startDay: live.startDay,
    titleRomaji: live.titleRomaji,
    titleEnglish: live.titleEnglish,
    titleNative: live.titleNative,
    synonyms: live.synonyms,
    anilistAverageScore: live.averageScore,
    anilistMeanScore: live.meanScore,
    anilistPopularity: live.popularity,
    anilistFavourites: live.favourites,
    anilistSource: live.source,
    liveDataUnavailable: false,
  };
}

export default async function TitleDetailPage(props: PageProps<"/titles/[id]">) {
  const { id } = await props.params;

  const title = await prisma.title.findUnique({ where: { id } });
  if (!title) notFound();

  const display = await resolveTitleDisplay(title);

  const [categories, user, reviews, libraryStats] = await Promise.all([
    prisma.category.findMany({
      where: { appliesToType: { has: title.type } },
      orderBy: { name: "asc" },
    }),
    getCurrentUser(),
    prisma.review.findMany({
      where: { titleId: id, approvalStatus: "PUBLISHED" },
      include: {
        user: { select: { username: true, role: true } },
        categoryScores: { include: { category: true } },
        sealAwards: { include: { sealType: true } },
        comments: {
          include: { user: { select: { username: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Reader-activity analytics — how many people have this title in each
    // library status. Grouped rather than 4 separate counts.
    prisma.libraryEntry.groupBy({ by: ["status"], where: { titleId: id }, _count: true }),
  ]);

  const libraryCounts = Object.fromEntries(
    libraryStats.map((s) => [s.status, s._count]),
  ) as Partial<Record<LibraryStatus, number>>;
  const totalLibraryEntries = libraryStats.reduce((sum, s) => sum + s._count, 0);

  const existingReview = user
    ? await prisma.review.findUnique({
        where: { userId_titleId: { userId: user.id, titleId: id } },
        include: { categoryScores: true },
      })
    : null;

  const libraryEntry = user
    ? await prisma.libraryEntry.findUnique({
        where: { userId_titleId: { userId: user.id, titleId: id } },
      })
    : null;

  const gate =
    user && !existingReview ? await checkReviewGate(user.id, user.createdAt) : { allowed: true as const };

  const userVotes = user
    ? Object.fromEntries(
        (
          await prisma.vote.findMany({
            where: {
              userId: user.id,
              targetType: "REVIEW",
              targetId: { in: reviews.map((r) => r.id) },
            },
          })
        ).map((v) => [v.targetId, v.value]),
      )
    : {};

  const details: { label: string; value: string }[] = [
    { label: "Status", value: display.status },
    { label: "Start Date", value: formatStartDate(display.publicationYear, display.startMonth, display.startDay) },
    { label: "Average Score", value: display.anilistAverageScore !== null ? `${display.anilistAverageScore}%` : null },
    { label: "Mean Score", value: display.anilistMeanScore !== null ? `${display.anilistMeanScore}%` : null },
    { label: "Popularity", value: display.anilistPopularity?.toLocaleString() ?? null },
    { label: "Favorites", value: display.anilistFavourites?.toLocaleString() ?? null },
    { label: "Source", value: formatSource(display.anilistSource) },
    { label: "Genres", value: display.genres.length > 0 ? display.genres.join(", ") : null },
    { label: "Romaji", value: display.titleRomaji },
    { label: "English", value: display.titleEnglish },
    { label: "Native", value: display.titleNative },
    { label: "Synonyms", value: display.synonyms.length > 0 ? display.synonyms.join(", ") : null },
  ].filter((d): d is { label: string; value: string } => !!d.value);

  // Per-category breakdown still reads the JSON blob (no separate scalar
  // per category); the combined figure now reads the precomputed
  // communityScore directly instead of re-averaging it here (Journal
  // Entry 39 — never recalculated live).
  const avgScores = (title.avgCategoryScores as Record<string, number> | null) ?? {};
  const scoreEntries = categories
    .map((c) => ({ name: c.name, score: avgScores[c.id] }))
    .filter((e): e is { name: string; score: number } => typeof e.score === "number");
  const overallAvg = title.communityScore;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {title.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={title.coverUrl}
            alt={display.name}
            className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-lg shadow-black/30"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{display.name}</h1>
          <p className="text-sm text-muted">
            {title.type} · {display.status}
            {display.publicationYear ? ` · ${display.publicationYear}` : ""}
          </p>
          {display.liveDataUnavailable && (
            <p className="mt-2 text-sm text-amber-400">
              Live details from AniList are unavailable right now — showing limited info.
            </p>
          )}
          {display.author && (
            <p className="mt-2 text-sm text-muted">
              By {display.author}
              {display.illustrator ? ` (art: ${display.illustrator})` : ""}
            </p>
          )}
          {display.synopsis && (
            <p className="mt-3 text-sm leading-6 text-foreground/90">{display.synopsis}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="#review" className={BUTTON_PRIMARY}>
              {existingReview ? "Edit your review" : "Write a review"}
            </Link>
            {user && <LibraryWidget titleId={id} currentStatus={libraryEntry?.status ?? null} />}
            {user && <ReportButton targetType="TITLE" targetId={id} />}
          </div>
        </div>
      </div>

      {overallAvg !== null && (
        <div className={`mt-6 flex flex-wrap items-center gap-6 ${CARD} p-4`}>
          <div>
            <div className="text-3xl font-bold text-accent">{overallAvg}</div>
            <div className="text-xs text-muted">
              {title.reviewCount} review{title.reviewCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {scoreEntries.map((e) => (
              <div key={e.name}>
                {e.name}: <span className="text-foreground">{e.score}</span>
              </div>
            ))}
          </div>
          {title.certifiedBangerCount > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <div>🏅 {title.certifiedBangerCount} Certified Banger</div>
            </div>
          )}
        </div>
      )}

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

      {totalLibraryEntries > 0 && (
        <div className={`mt-6 ${CARD} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Reader Activity</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {LIBRARY_STATUS_DISPLAY.map(({ status, label, emoji }) => (
              <div key={status}>
                <span aria-hidden="true">{emoji}</span>{" "}
                <span className="font-medium text-foreground">
                  {libraryCounts[status] ?? 0}
                </span>{" "}
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="review" className="mt-10 scroll-mt-6 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground">
          {existingReview ? "Your review" : "Write a review"}
        </h2>
        {user && !gate.allowed && (
          <p className="mt-2 text-sm text-amber-400">{gate.reason}</p>
        )}
        {existingReview?.approvalStatus === "PENDING_APPROVAL" && (
          <p className="mt-2 text-sm text-amber-400">
            Awaiting Main Admin approval — not visible to others yet.
          </p>
        )}
        {existingReview?.approvalStatus === "REJECTED" && (
          <p className="mt-2 text-sm text-red-400">
            This review was rejected by the Main Admin. Editing and resubmitting sends it back
            for review.
          </p>
        )}
        {user ? (
          gate.allowed && (
            <div className="mt-4">
              <ReviewForm
                action={submitReview.bind(null, id)}
                categories={categories}
                existingReview={
                  existingReview
                    ? {
                        bodyText: existingReview.bodyText,
                        spoilerText: existingReview.spoilerText,
                        scores: Object.fromEntries(
                          existingReview.categoryScores.map((s) => [s.categoryId, s.score]),
                        ),
                      }
                    : undefined
                }
              />
            </div>
          )
        ) : (
          <p className="mt-2 text-sm text-muted">
            <Link href="/login" className={LINK}>
              Log in
            </Link>{" "}
            to write a review.
          </p>
        )}
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground">Reviews ({reviews.length})</h2>
        <ul className="mt-4 flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className={`${CARD} p-4`}>
              <div className="flex items-baseline justify-between">
                <Link href={`/profile/${review.user.username}`} className="font-medium text-foreground hover:text-accent">
                  <UsernameLabel username={review.user.username} role={review.user.role} />
                </Link>
                <span className="text-sm font-medium text-accent">
                  {review.overallScore?.toFixed(2)} / {categories[0]?.scaleMax ?? 10}
                </span>
              </div>
              {review.sealAwards.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {review.sealAwards.map((award) => (
                    <span
                      key={award.id}
                      className={
                        award.sealType.name === "Certified Banger"
                          ? "inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
                          : "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"
                      }
                    >
                      {award.sealType.name === "Certified Banger" ? "🏅" : "💎"} {award.sealType.name}
                      {award.status === "PROVISIONAL" && " (provisional)"}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                {review.categoryScores.map((s) => (
                  <span key={s.categoryId}>
                    {s.category.name}: {s.score}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <VoteButtons
                  reviewId={review.id}
                  titleId={id}
                  upvoteCount={review.upvoteCount}
                  downvoteCount={review.downvoteCount}
                  userVote={(userVotes[review.id] as "UP" | "DOWN" | undefined) ?? null}
                  canVote={!!user && review.userId !== user.id}
                />
                {user && review.userId !== user.id && (
                  <ReportButton targetType="REVIEW" targetId={review.id} />
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/90">{review.bodyText}</p>
              {review.spoilerText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted">
                    Contains spoilers — click to show
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-foreground/90">{review.spoilerText}</p>
                </details>
              )}

              {review.comments.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2 border-l-2 border-border pl-3">
                  {review.comments.map((comment) => (
                    <li key={comment.id} className="text-sm">
                      <span className="font-medium text-foreground">
                        <UsernameLabel username={comment.user.username} role={comment.user.role} />
                      </span>{" "}
                      <span className="text-foreground/80">{comment.bodyText}</span>
                      {user && comment.userId !== user.id && (
                        <span className="ml-2">
                          <ReportButton targetType="COMMENT" targetId={comment.id} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {user ? (
                <CommentForm reviewId={review.id} titleId={id} />
              ) : (
                <p className="mt-2 text-sm text-muted">
                  <Link href="/login" className={LINK}>
                    Log in
                  </Link>{" "}
                  to comment.
                </p>
              )}
            </li>
          ))}
          {reviews.length === 0 && <li className="text-sm text-muted">No reviews yet.</li>}
        </ul>
      </div>
    </div>
  );
}
