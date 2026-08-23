import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { UsernameLabel } from "@/components/username-label";
import { LINK } from "@/lib/ui-classes";

// Entry 54: a followed user's qualifying activity — a published review, or
// a library status set to Finished/Dropped — derived live from Review/
// LibraryEntry rather than a dedicated event-log table (same pattern as
// Reader Activity and the profile Library stat). This means a status
// change away from Finished/Dropped later erases that moment from the
// feed — there's no history, only current state — an accepted tradeoff
// for not introducing write-time hooks into every review/library action.
type FeedItem = {
  kind: "review" | "finished" | "dropped";
  at: Date;
  username: string;
  role: string;
  titleId: string;
  titleName: string;
};

export default async function FeedPage() {
  const user = await requireUser();

  const followedIds = (
    await prisma.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } })
  ).map((f) => f.followingId);

  if (followedIds.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="mb-4 text-xl font-semibold text-foreground">Feed</h1>
        <p className="text-sm text-muted">
          You&apos;re not following anyone yet. Follow a user from their profile to see their
          reviews and reading activity here.
        </p>
      </div>
    );
  }

  const [reviews, libraryEntries] = await Promise.all([
    prisma.review.findMany({
      where: { userId: { in: followedIds }, approvalStatus: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        createdAt: true,
        title: { select: { id: true, name: true } },
        user: { select: { username: true, role: true } },
      },
    }),
    prisma.libraryEntry.findMany({
      where: { userId: { in: followedIds }, status: { in: ["FINISHED", "DROPPED"] } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        status: true,
        updatedAt: true,
        title: { select: { id: true, name: true } },
        user: { select: { username: true, role: true } },
      },
    }),
  ]);

  const items: FeedItem[] = [
    ...reviews.map((r): FeedItem => ({
      kind: "review",
      at: r.createdAt,
      username: r.user.username,
      role: r.user.role,
      titleId: r.title.id,
      titleName: r.title.name,
    })),
    ...libraryEntries.map((e): FeedItem => ({
      kind: e.status === "FINISHED" ? "finished" : "dropped",
      at: e.updatedAt,
      username: e.user.username,
      role: e.user.role,
      titleId: e.title.id,
      titleName: e.title.name,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 30);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Feed</h1>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={i} className="rounded-xl border border-border bg-panel p-4 text-sm">
              <Link href={`/profile/${item.username}`} className="font-medium text-foreground hover:text-accent">
                <UsernameLabel username={item.username} role={item.role} />
              </Link>{" "}
              <span className="text-muted">
                {item.kind === "review" && "wrote a review for"}
                {item.kind === "finished" && "finished reading"}
                {item.kind === "dropped" && "dropped"}
              </span>{" "}
              <Link href={`/titles/${item.titleId}`} className={LINK}>
                {item.titleName}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No recent activity from people you follow yet.</p>
      )}
    </div>
  );
}
