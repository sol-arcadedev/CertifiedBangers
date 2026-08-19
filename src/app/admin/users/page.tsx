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
      <h1 className="mb-2 text-xl font-semibold text-foreground">Users</h1>
      <p className="mb-6 text-sm text-muted">
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
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground"
        />
      </form>

      <ul className="divide-y divide-border">
        {users.map((user) => {
          const canModerate =
            user.id !== actor.id && (user.role === "USER" || actor.role === "MAIN_ADMIN");
          return (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <UsernameLabel username={user.username} role={user.role} />
                <div className="text-sm text-muted">
                  {user.status} · rep {user.reputationScore}
                </div>
              </div>
              {canModerate && (
                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.filter((a) => a.status !== user.status).map((a) => (
                    <form key={a.status} action={setUserStatus.bind(null, user.id, a.status)}>
                      <button
                        type="submit"
                        className="rounded-full border border-border-strong px-3 py-1.5 text-sm text-foreground"
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
          <li className="py-6 text-sm text-muted">
            {q ? `No users matching "${q}".` : "No users yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
