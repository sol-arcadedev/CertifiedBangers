import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsernameLabel } from "@/components/username-label";

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
    },
  });

  if (!user) notFound();

  const joined = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

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
      </div>
    </div>
  );
}
