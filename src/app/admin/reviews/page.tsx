import Link from "next/link";
import { requireMainAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { approveReview, rejectReview } from "@/lib/actions/review-moderation";
import { UsernameLabel } from "@/components/username-label";

export default async function AdminReviewsPage() {
  await requireMainAdmin();

  const pending = await prisma.review.findMany({
    where: { approvalStatus: "PENDING_APPROVAL" },
    include: {
      user: { select: { username: true, role: true } },
      title: { select: { id: true, name: true } },
      categoryScores: { include: { category: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
        Pending review approvals
      </h1>

      {pending.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing waiting on approval.</p>
      )}

      <ul className="flex flex-col gap-6">
        {pending.map((review) => (
          <li
            key={review.id}
            className="rounded-md border border-black/[.08] p-4 dark:border-white/[.145]"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <UsernameLabel username={review.user.username} role={review.user.role} /> on{" "}
                <Link href={`/titles/${review.title.id}`} className="underline">
                  {review.title.name}
                </Link>
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {review.overallScore?.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              {review.categoryScores.map((s) => (
                <span key={s.categoryId}>
                  {s.category.name}: {s.score}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {review.bodyText}
            </p>

            <div className="mt-3 flex gap-3">
              <form action={approveReview.bind(null, review.id)}>
                <button
                  type="submit"
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background"
                >
                  Approve
                </button>
              </form>
              <form action={rejectReview.bind(null, review.id)}>
                <button
                  type="submit"
                  className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
                >
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
