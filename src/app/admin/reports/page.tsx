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
      <h1 className="mb-2 font-display text-xl font-bold text-foreground">Reports</h1>
      <p className="mb-6 text-sm text-muted">
        Open reports, oldest first. Dismiss if there&apos;s nothing to act on, or remove the
        reported content directly.
      </p>

      <ul className="divide-y divide-border">
        {reports.map((report, i) => {
          const preview = previews[i];
          return (
            <li key={report.id} className="py-4">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>
                  {report.targetType} reported by {report.reporter.username}
                </span>
                <span>{report.createdAt.toLocaleDateString()}</span>
              </div>

              <p className="mt-1 text-foreground">
                <span className="font-medium">Reason: </span>
                {report.reason}
              </p>

              {preview.missing ? (
                <p className="mt-1 text-sm italic text-muted">
                  Target no longer exists.
                </p>
              ) : (
                <div className="mt-2 rounded-md bg-panel-hover p-3 text-sm">
                  {"titleName" in preview && preview.titleName && (
                    <Link
                      href={`/titles/${preview.titleId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {preview.titleName}
                    </Link>
                  )}
                  {"author" in preview && preview.author && (
                    <p className="mt-1 text-muted">
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
                    className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground"
                  >
                    Mark resolved
                  </button>
                </form>
                <form action={resolveReport.bind(null, report.id, "DISMISSED")}>
                  <button
                    type="submit"
                    className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground"
                  >
                    Dismiss
                  </button>
                </form>
                {!preview.missing && report.targetType === "REVIEW" && actor.role === "MAIN_ADMIN" && (
                  <form action={removeReportedReview.bind(null, report.id, report.targetId)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-900/40 px-4 py-1.5 text-sm text-red-400"
                    >
                      Remove review
                    </button>
                  </form>
                )}
                {!preview.missing && report.targetType === "COMMENT" && (
                  <form action={removeReportedComment.bind(null, report.id, report.targetId)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-900/40 px-4 py-1.5 text-sm text-red-400"
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
          <li className="py-6 text-sm text-muted">No open reports.</li>
        )}
      </ul>
    </div>
  );
}
