import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ReviewForm } from "@/components/review-form";

// Bare-bones public title page — hosts review creation (WP2.1). Aggregate
// score display and precomputed-aggregate wiring are WP2.4's job, not this
// one; this page deliberately doesn't compute/show a title-level average.
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
        user: { select: { username: true } },
        categoryScores: { include: { category: true } },
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

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex gap-6">
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
        </div>
      </div>

      <div className="mt-10 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          {existingReview ? "Your review" : "Write a review"}
        </h2>
        {user ? (
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
                  {review.user.username}
                </Link>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {review.overallScore?.toFixed(2)} / {categories[0]?.scaleMax ?? 10}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {review.categoryScores.map((s) => (
                  <span key={s.categoryId}>
                    {s.category.name}: {s.score}
                  </span>
                ))}
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
