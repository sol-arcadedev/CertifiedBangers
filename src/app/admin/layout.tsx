import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/[.08] bg-white px-4 py-3 sm:px-6 text-sm font-medium dark:border-white/[.145] dark:bg-zinc-950">
        <span className="text-zinc-500 dark:text-zinc-400">Admin</span>
        <Link href="/admin/titles" className="text-zinc-700 dark:text-zinc-300">
          Titles
        </Link>
        <Link href="/admin/seals" className="text-zinc-700 dark:text-zinc-300">
          Seals
        </Link>
        <Link href="/admin/reports" className="text-zinc-700 dark:text-zinc-300">
          Reports
        </Link>
        <Link href="/admin/users" className="text-zinc-700 dark:text-zinc-300">
          Users
        </Link>
        {user.role === "MAIN_ADMIN" && (
          <>
            <Link href="/admin/reviews" className="text-zinc-700 dark:text-zinc-300">
              Reviews
            </Link>
            <Link href="/admin/admins" className="text-zinc-700 dark:text-zinc-300">
              Admins
            </Link>
            <Link href="/admin/config" className="text-zinc-700 dark:text-zinc-300">
              Config
            </Link>
            <Link href="/admin/settings" className="text-zinc-700 dark:text-zinc-300">
              Settings
            </Link>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
