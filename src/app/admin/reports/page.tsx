import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { resolveReport, removeReportedReview, removeReportedComment } from "@/lib/actions/moderation";

async function loadPreview(targetType: "REVIEW" | "COMMENT" | "TITLE", targetId: string) {
  if (targetType === "REVIEW") {
    const review = await prisma.review.findUnique({
      where: { id: targetId },
      select: {
        bodyText: true,
        user: { select: { username: true } },
        title: { select: { id: true, name: true } },
      },
    });
    if (!review) return { missing: true as const };
    return {
      missing: false as const,
      author: review.user.username,
      snippet: review.bodyText.slice(0, 160),
      titleId: review.title.id,
      titleName: review.title.name,
    };
  }
  if (targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      select: {
        bodyText: true,
        user: { select: { username: true } },
        review: { select: { title: { select: { id: true, name: true } } } },
      },
    });
    if (!comment) return { missing: true as const };
    return {
      missing: false as const,
      author: comment.user.username,
      snippet: comment.bodyText.slice(0, 160),
      titleId: comment.review.title.id,
      titleName: comment.review.title.name,
    };
  }
  const title = await prisma.title.findUnique({ where: { id: targetId }, select: { id: true, name: true } });
  if (!title) return { missing: true as const };
  return { missing: false as const, titleId: title.id, titleName: title.name };
}

export default async function AdminReportsPage() {
  const actor = await requireAdmin();

  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { reporter: { select: { username: true } } },
  });

  const previews = await Promise.all(
    reports.map((report) => loadPreview(report.targetType, report.targetId)),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">Reports</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Open reports, oldest first. Dismiss if there&apos;s nothing to act on, or remove the
        reported content directly.
      </p>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {reports.map((report, i) => {
          const preview = previews[i];
          return (
            <li key={report.id} className="py-4">
              <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>
                  {report.targetType} reported by {report.reporter.username}
                </span>
                <span>{report.createdAt.toLocaleDateString()}</span>
              </div>

              <p className="mt-1 text-black dark:text-zinc-50">
                <span className="font-medium">Reason: </span>
                {report.reason}
              </p>

              {preview.missing ? (
                <p className="mt-1 text-sm italic text-zinc-500 dark:text-zinc-400">
                  Target no longer exists.
                </p>
              ) : (
                <div className="mt-2 rounded-md bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">
                  {"titleName" in preview && preview.titleName && (
                    <Link
                      href={`/titles/${preview.titleId}`}
                      className="font-medium text-black hover:underline dark:text-zinc-50"
                    >
                      {preview.titleName}
                    </Link>
                  )}
                  {"author" in preview && preview.author && (
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      by {preview.author}: &ldquo;{preview.snippet}
                      {preview.snippet && preview.snippet.length >= 160 ? "…" : ""}&rdquo;
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={resolveReport.bind(null, report.id, "RESOLVED")}>
                  <button
                    type="submit"
                    className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
                  >
                    Mark resolved
                  </button>
                </form>
                <form action={resolveReport.bind(null, report.id, "DISMISSED")}>
                  <button
                    type="submit"
                    className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
                  >
                    Dismiss
                  </button>
                </form>
                {!preview.missing && report.targetType === "REVIEW" && actor.role === "MAIN_ADMIN" && (
                  <form action={removeReportedReview.bind(null, report.id, report.targetId)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
                    >
                      Remove review
                    </button>
                  </form>
                )}
                {!preview.missing && report.targetType === "COMMENT" && (
                  <form action={removeReportedComment.bind(null, report.id, report.targetId)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
                    >
                      Remove comment
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
        {reports.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">No open reports.</li>
        )}
      </ul>
    </div>
  );
}
