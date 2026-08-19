import { requireMainAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { setAdminTrust } from "@/lib/actions/admin-users";

export default async function AdminAdminsPage() {
  const mainAdmin = await requireMainAdmin();

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, adminReviewsRequireApproval: true },
    orderBy: { username: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-foreground">Admins</h1>
      <p className="mb-6 text-sm text-muted">
        By default an admin&apos;s reviews wait for {mainAdmin.username}&apos;s approval before
        publishing (Journal Entry 28). Lift that once you trust them — a manual, case-by-case
        call (Entry 41).
      </p>

      <ul className="divide-y divide-border">
        {admins.map((admin) => (
          <li key={admin.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="text-foreground">{admin.username}</span>
            {admin.adminReviewsRequireApproval ? (
              <form action={setAdminTrust.bind(null, admin.id, false)}>
                <button
                  type="submit"
                  className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground"
                >
                  Trust — publish immediately
                </button>
              </form>
            ) : (
              <form action={setAdminTrust.bind(null, admin.id, true)}>
                <button
                  type="submit"
                  className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground"
                >
                  Require approval again
                </button>
              </form>
            )}
          </li>
        ))}
        {admins.length === 0 && (
          <li className="py-6 text-sm text-muted">
            No admins yet — promote one with{" "}
            <code className="rounded bg-panel-hover px-1 py-0.5">
              npm run promote-admin
            </code>
            .
          </li>
        )}
      </ul>
    </div>
  );
}
