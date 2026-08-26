import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkReviewGate } from "@/lib/review-gate";
import { submitReview } from "@/lib/actions/reviews";
import { ReviewForm } from "@/components/review-form";
import { UsernameLabel } from "@/components/username-label";
import { VoteButtons } from "@/components/vote-buttons";
import { CommentForm } from "@/components/comment-form";
import { ReportButton } from "@/components/report-button";
import { LibraryWidget } from "@/components/library-widget";
import { formatStartDate, formatSource } from "@/lib/title-format";
import { stripHtml } from "@/lib/strip-html";
import { BUTTON_PRIMARY, LINK, CARD } from "@/lib/ui-classes";
import type { LibraryStatus } from "@/generated/prisma/enums";

const LIBRARY_STATUS_DISPLAY: { status: LibraryStatus; label: string; emoji: string }[] = [
  { status: "CURRENTLY_READING", label: "Currently Reading", emoji: "📖" },
  { status: "FINISHED", label: "Finished", emoji: "✅" },
  { status: "PLAN_TO_READ", label: "Plan to Read", emoji: "📋" },
  { status: "DROPPED", label: "Dropped", emoji: "❌" },
];

export default async function TitleDetailPage(props: PageProps<"/titles/[id]">) {
  const { id } = await props.params;

  // Entry 61: title and the current user don't depend on each other, so
  // they're fetched in parallel — same reasoning applies to every stage
  // below. This page used to run up to six DB/Auth round-trips back to
  // back for a logged-in user (title, then a 4-query batch, then three
  // more one at a time); it's now three stages at most.
  const [title, user] = await Promise.all([
    prisma.title.findUnique({
      where: { id },
      include: { discoveredByUser: { select: { username: true, role: true } } },
    }),
    getCurrentUser(),
  ]);
  if (!title) notFound();

  const [categories, reviews, libraryStats, existingReview, libraryEntry, gate] = await Promise.all([
    prisma.category.findMany({
      where: { appliesToType: { has: title.type } },
      orderBy: { name: "asc" },
    }),
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
    user
      ? prisma.review.findUnique({
          where: { userId_titleId: { userId: user.id, titleId: id } },
          include: { categoryScores: true },
        })
      : Promise.resolve(null),
    user
      ? prisma.libraryEntry.findUnique({ where: { userId_titleId: { userId: user.id, titleId: id } } })
      : Promise.resolve(null),
    // Always run (not gated on "no existing review yet") so it can join
    // the same parallel batch — checkReviewGate's own first query is a
    // cheap no-op past a user's first-ever review, and running it
    // redundantly in parallel costs nothing the UI doesn't already
    // discard via `!existingReview` below.
    user ? checkReviewGate(user.id, user.createdAt) : Promise.resolve({ allowed: true as const }),
  ]);

  const libraryCounts = Object.fromEntries(
    libraryStats.map((s) => [s.status, s._count]),
  ) as Partial<Record<LibraryStatus, number>>;
  const totalLibraryEntries = libraryStats.reduce((sum, s) => sum + s._count, 0);

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
    { label: "Status", value: title.status },
    { label: "Start Date", value: formatStartDate(title.publicationYear, title.startMonth, title.startDay) },
    { label: "Average Score", value: title.anilistAverageScore !== null ? `${title.anilistAverageScore}%` : null },
    { label: "Mean Score", value: title.anilistMeanScore !== null ? `${title.anilistMeanScore}%` : null },
    { label: "Popularity", value: title.anilistPopularity?.toLocaleString() ?? null },
    { label: "Favorites", value: title.anilistFavourites?.toLocaleString() ?? null },
    { label: "Source", value: formatSource(title.anilistSource) },
    { label: "Genres", value: title.genres.length > 0 ? title.genres.join(", ") : null },
    { label: "Romaji", value: title.titleRomaji },
    { label: "English", value: title.titleEnglish },
    { label: "Native", value: title.titleNative },
    { label: "Synonyms", value: title.synonyms.length > 0 ? title.synonyms.join(", ") : null },
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
            alt={title.name}
            className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-lg shadow-black/30"
          />
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title.name}</h1>
          <p className="text-sm text-muted">
            {title.type} · {title.status}
            {title.publicationYear ? ` · ${title.publicationYear}` : ""}
          </p>
          {title.author && (
            <p className="mt-2 text-sm text-muted">
              By {title.author}
              {title.illustrator ? ` (art: ${title.illustrator})` : ""}
            </p>
          )}
          {title.synopsis && (
            // Defensive — rows mirrored before Entry 76 fixed ingestion can
            // still carry AniList's raw <b>/<i> formatting tags as literal
            // text until their next daily refresh re-syncs them clean.
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/90">
              {stripHtml(title.synopsis)}
            </p>
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
          {title.discoveredByUser && (
            <div className="text-sm text-muted">
              Discovered by{" "}
              <Link href={`/profile/${title.discoveredByUser.username}`} className={LINK}>
                <UsernameLabel
                  username={title.discoveredByUser.username}
                  role={title.discoveredByUser.role}
                />
              </Link>
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
