import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { revokeSeal } from "@/lib/actions/seals";
import { GrantSealButton } from "@/components/admin/grant-seal-button";
import { UsernameLabel } from "@/components/username-label";

export default async function AdminSealsPage(props: PageProps<"/admin/seals">) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const [sealTypes, reviews] = await Promise.all([
    prisma.sealType.findMany({ orderBy: { name: "asc" } }),
    prisma.review.findMany({
      where: {
        approvalStatus: "PUBLISHED",
        ...(q ? { title: { name: { contains: q, mode: "insensitive" } } } : {}),
      },
      include: {
        user: { select: { username: true, role: true } },
        title: { select: { id: true, name: true } },
        sealAwards: { include: { sealType: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
        Seal verification
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Phase 1 admin-verified grants (Journal Entry 6) — grant a seal directly with a
        justification; it&apos;s permanent immediately (Entry 11).
      </p>

      <form className="mb-6" action="/admin/seals">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by title name…"
          className="w-full rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50"
        />
      </form>

      <ul className="flex flex-col gap-6">
        {reviews.map((review) => {
          const grantedSealTypeIds = new Set(review.sealAwards.map((a) => a.sealTypeId));
          return (
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
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {review.bodyText}
              </p>

              {review.sealAwards.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.sealAwards.map((award) => (
                    <form key={award.id} action={revokeSeal.bind(null, award.id)}>
                      <button
                        type="submit"
                        title="Click to revoke"
                        className="rounded-full bg-foreground px-3 py-1 text-xs text-background"
                      >
                        {award.sealType.name} ✕
                      </button>
                    </form>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {sealTypes
                  .filter((st) => !grantedSealTypeIds.has(st.id))
                  .map((st) => (
                    <GrantSealButton
                      key={st.id}
                      reviewId={review.id}
                      sealTypeId={st.id}
                      sealTypeName={st.name}
                    />
                  ))}
              </div>
            </li>
          );
        })}
        {reviews.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            {q ? `No published reviews matching "${q}".` : "No published reviews yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
