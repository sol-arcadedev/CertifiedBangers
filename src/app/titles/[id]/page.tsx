import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkReviewGate } from "@/lib/review-gate";
import { ReviewForm } from "@/components/review-form";
import { UsernameLabel } from "@/components/username-label";
import { VoteButtons } from "@/components/vote-buttons";
import { CommentForm } from "@/components/comment-form";
import { ReportButton } from "@/components/report-button";
import { LibraryWidget } from "@/components/library-widget";

function formatStartDate(year: number | null, month: number | null, day: number | null) {
  if (!year) return null;
  if (month && day) {
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (month) {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return String(year);
}

function formatSource(source: string | null) {
  if (!source) return null;
  return source
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function TitleDetailPage(props: PageProps<"/titles/[id]">) {
  const { id } = await props.params;

  const title = await prisma.title.findUnique({ where: { id } });
  if (!title) notFound();

  const [categories, user, reviews] = await Promise.all([
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
  ]);

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
            className="h-48 w-32 shrink-0 rounded object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{title.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {title.type} · {title.status}
            {title.publicationYear ? ` · ${title.publicationYear}` : ""}
          </p>
          {title.author && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              By {title.author}
              {title.illustrator ? ` (art: ${title.illustrator})` : ""}
            </p>
          )}
          {title.synopsis && (
            <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {title.synopsis}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href="#review"
              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              {existingReview ? "Edit your review" : "Write a review"}
            </Link>
            {user && <LibraryWidget titleId={id} currentStatus={libraryEntry?.status ?? null} />}
            {user && <ReportButton targetType="TITLE" targetId={id} />}
          </div>
        </div>
      </div>

      {overallAvg !== null && (
        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]">
          <div>
            <div className="text-3xl font-bold text-black dark:text-zinc-50">{overallAvg}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {title.reviewCount} review{title.reviewCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {scoreEntries.map((e) => (
              <div key={e.name}>
                {e.name}: {e.score}
              </div>
            ))}
          </div>
          {(title.certifiedBangerCount > 0 || title.hiddenGemCount > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {title.certifiedBangerCount > 0 && (
                <div>🏅 {title.certifiedBangerCount} Certified Banger</div>
              )}
              {title.hiddenGemCount > 0 && <div>💎 {title.hiddenGemCount} Hidden Gem</div>}
            </div>
          )}
        </div>
      )}

      {details.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-md border border-black/[.08] p-4 sm:grid-cols-3 dark:border-white/[.145]">
          {details.map((d) => (
            <div key={d.label}>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {d.label}
              </div>
              <div className="text-sm text-black dark:text-zinc-50">{d.value}</div>
            </div>
          ))}
        </div>
      )}

      <div id="review" className="mt-10 scroll-mt-6 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          {existingReview ? "Your review" : "Write a review"}
        </h2>
        {user && !gate.allowed && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{gate.reason}</p>
        )}
        {existingReview?.approvalStatus === "PENDING_APPROVAL" && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Awaiting Main Admin approval — not visible to others yet.
          </p>
        )}
        {existingReview?.approvalStatus === "REJECTED" && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            This review was rejected by the Main Admin. Editing and resubmitting sends it back
            for review.
          </p>
        )}
        {user ? (
          gate.allowed && (
            <div className="mt-4">
              <ReviewForm
                titleId={id}
                categories={categories}
                existingReview={
                  existingReview
                    ? {
                        bodyText: existingReview.bodyText,
                        spoilerFlag: existingReview.spoilerFlag,
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
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            to write a review.
          </p>
        )}
      </div>

      <div className="mt-10 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Reviews ({reviews.length})
        </h2>
        <ul className="mt-4 flex flex-col gap-6">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-black/[.08] pb-6 dark:border-white/[.145]">
              <div className="flex items-baseline justify-between">
                <Link
                  href={`/profile/${review.user.username}`}
                  className="font-medium text-black dark:text-zinc-50"
                >
                  <UsernameLabel username={review.user.username} role={review.user.role} />
                </Link>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {review.overallScore?.toFixed(2)} / {categories[0]?.scaleMax ?? 10}
                </span>
              </div>
              {review.sealAwards.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {review.sealAwards.map((award) => (
                    <span
                      key={award.id}
                      className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300"
                    >
                      {award.sealType.name === "Certified Banger" ? "🏅" : "💎"} {award.sealType.name}
                      {award.status === "PROVISIONAL" && " (provisional)"}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {review.categoryScores.map((s) => (
                  <span key={s.categoryId}>
                    {s.category.name}: {s.score}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
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
              {review.spoilerFlag ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
                    Contains spoilers — click to show
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {review.bodyText}
                  </p>
                </details>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {review.bodyText}
                </p>
              )}

              {review.comments.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2 border-l-2 border-black/[.08] pl-3 dark:border-white/[.145]">
                  {review.comments.map((comment) => (
                    <li key={comment.id} className="text-sm">
                      <span className="font-medium text-black dark:text-zinc-50">
                        <UsernameLabel username={comment.user.username} role={comment.user.role} />
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">{comment.bodyText}</span>
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
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Link href="/login" className="underline">
                    Log in
                  </Link>{" "}
                  to comment.
                </p>
              )}
            </li>
          ))}
          {reviews.length === 0 && (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">No reviews yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
