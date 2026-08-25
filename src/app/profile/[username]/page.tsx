import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UsernameLabel } from "@/components/username-label";
import { TitleCardGrid } from "@/components/title-card-grid";
import { ProfileImageForm } from "@/components/profile-image-form";
import { FollowButton } from "@/components/follow-button";
import { EmptyState } from "@/components/empty-state";
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

  const [user, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        role: true,
        reputationScore: true,
        createdAt: true,
        _count: {
          select: { reviews: true, followers: true, following: true, discoveredTitles: true },
        },
        // Public — library entries aren't restricted to the profile owner,
        // matching the hybrid browsing model (Entry 3).
        libraryEntries: {
          include: {
            title: {
              select: {
                id: true,
                name: true,
                type: true,
                coverUrl: true,
                anilistAverageScore: true,
                status: true,
                genres: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!user) notFound();

  const isOwner = currentUser?.id === user.id;

  const isFollowing =
    currentUser && !isOwner
      ? !!(await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: currentUser.id, followingId: user.id } },
        }))
      : false;

  const joined = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const libraryGroups = LIBRARY_STATUS_ORDER.map(({ status, label }) => ({
    label,
    titles: user.libraryEntries.filter((e) => e.status === status).map((e) => e.title),
  })).filter((g) => g.titles.length > 0);

  return (
    <div className="flex flex-1 flex-col items-center bg-background pb-16">
      <div className="h-40 w-full bg-gradient-to-b from-panel to-background sm:h-48">
        {user.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="w-full max-w-2xl px-4">
        <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.username}
              width={88}
              height={88}
              className="h-[88px] w-[88px] shrink-0 rounded-full object-cover ring-4 ring-background"
            />
          ) : (
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-panel text-3xl font-semibold text-accent ring-4 ring-background">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="flex flex-1 items-end justify-between gap-4 pb-1">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                <UsernameLabel username={user.username} role={user.role} />
              </h1>
              <p className="text-sm text-muted">Joined {joined}</p>
            </div>
            {currentUser && !isOwner && (
              <FollowButton
                targetUserId={user.id}
                targetUsername={user.username}
                initiallyFollowing={isFollowing}
              />
            )}
          </div>
        </div>

        {isOwner && <ProfileImageForm />}

        {user.bio && <p className="mt-6 text-base leading-7 text-foreground/90">{user.bio}</p>}

        <div className="mt-8 flex gap-8 border-t border-border pt-6">
          <div>
            <div className="text-lg font-semibold text-foreground">{user._count.reviews}</div>
            <div className="text-sm text-muted">Reviews</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">{user.reputationScore}</div>
            <div className="text-sm text-muted">Reputation</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">{user.libraryEntries.length}</div>
            <div className="text-sm text-muted">Library</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">{user._count.followers}</div>
            <div className="text-sm text-muted">Followers</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">{user._count.following}</div>
            <div className="text-sm text-muted">Following</div>
          </div>
          {user._count.discoveredTitles > 0 && (
            <div>
              <div className="text-lg font-semibold text-accent">
                🏅 {user._count.discoveredTitles}
              </div>
              <div className="text-sm text-muted">Discovered</div>
            </div>
          )}
        </div>

        {libraryGroups.length > 0 ? (
          libraryGroups.map((group) => (
            <div key={group.label} className="mt-8 border-t border-border pt-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                {group.label} ({group.titles.length})
              </h2>
              <TitleCardGrid titles={group.titles} />
            </div>
          ))
        ) : (
          <div className="mt-8 border-t border-border pt-6">
            <EmptyState
              message={
                isOwner
                  ? "Your library is empty — add a title from any title page to track it here."
                  : `${user.username} hasn't added any titles to their library yet.`
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
