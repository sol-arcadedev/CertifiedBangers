import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsernameLabel } from "@/components/username-label";
import { TitleCardGrid } from "@/components/title-card-grid";
import type { LibraryStatus } from "@/generated/prisma/enums";

const LIBRARY_STATUS_ORDER: { status: LibraryStatus; label: string }[] = [
  { status: "CURRENTLY_READING", label: "Currently Reading" },
  { status: "FINISHED", label: "Finished" },
  { status: "PLAN_TO_READ", label: "Plan to Read" },
  { status: "DROPPED", label: "Dropped" },
];

export default async function ProfilePage(
  props: PageProps<"/profile/[username]">,
) {
  const { username } = await props.params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      avatarUrl: true,
      bio: true,
      role: true,
      reputationScore: true,
      createdAt: true,
      _count: { select: { reviews: true } },
      // Public — library entries aren't restricted to the profile owner,
      // matching the hybrid browsing model (Entry 3).
      libraryEntries: {
        include: {
          title: { select: { id: true, name: true, type: true, coverUrl: true, anilistAverageScore: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const joined = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const libraryGroups = LIBRARY_STATUS_ORDER.map(({ status, label }) => ({
    label,
    titles: user.libraryEntries.filter((e) => e.status === status).map((e) => e.title),
  })).filter((g) => g.titles.length > 0);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.username}
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              <UsernameLabel username={user.username} role={user.role} />
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Joined {joined}
            </p>
          </div>
        </div>

        {user.bio && (
          <p className="mt-6 text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {user.bio}
          </p>
        )}

        <div className="mt-8 flex gap-8 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
          <div>
            <div className="text-lg font-semibold text-black dark:text-zinc-50">
              {user._count.reviews}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Reviews
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-black dark:text-zinc-50">
              {user.reputationScore}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Reputation
            </div>
          </div>
        </div>

        {libraryGroups.map((group) => (
          <div key={group.label} className="mt-8 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
            <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
              {group.label} ({group.titles.length})
            </h2>
            <TitleCardGrid titles={group.titles} />
          </div>
        ))}
      </div>
    </div>
  );
}
