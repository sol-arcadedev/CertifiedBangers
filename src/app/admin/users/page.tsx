import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { setUserStatus } from "@/lib/actions/moderation";
import { UsernameLabel } from "@/components/username-label";

const STATUS_ACTIONS: { status: "ACTIVE" | "SUSPENDED" | "BANNED"; label: string }[] = [
  { status: "ACTIVE", label: "Reinstate" },
  { status: "SUSPENDED", label: "Suspend" },
  { status: "BANNED", label: "Ban" },
];

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const actor = await requireAdmin();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const users = await prisma.user.findMany({
    where: q ? { username: { contains: q, mode: "insensitive" } } : undefined,
    select: { id: true, username: true, role: true, status: true, reputationScore: true },
    orderBy: { username: "asc" },
    take: 50,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">Users</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Suspending or banning only blocks future reviews, comments, votes, reports, and library
        changes — existing content stays up.{" "}
        {actor.role !== "MAIN_ADMIN" &&
          "Only the Main Admin can change another admin's status."}
      </p>

      <form className="mb-6" action="/admin/users">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by username…"
          className="w-full rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50"
        />
      </form>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {users.map((user) => {
          const canModerate =
            user.id !== actor.id && (user.role === "USER" || actor.role === "MAIN_ADMIN");
          return (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <UsernameLabel username={user.username} role={user.role} />
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {user.status} · rep {user.reputationScore}
                </div>
              </div>
              {canModerate && (
                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.filter((a) => a.status !== user.status).map((a) => (
                    <form key={a.status} action={setUserStatus.bind(null, user.id, a.status)}>
                      <button
                        type="submit"
                        className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
                      >
                        {a.label}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {users.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            {q ? `No users matching "${q}".` : "No users yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
