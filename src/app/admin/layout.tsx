import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";

const navLinkClass = "text-muted transition-colors hover:text-foreground";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-panel px-4 py-3 text-sm font-medium sm:px-6">
        <span className="text-muted">Admin</span>
        <Link href="/admin/titles" className={navLinkClass}>
          Titles
        </Link>
        <Link href="/admin/seals" className={navLinkClass}>
          Seals
        </Link>
        <Link href="/admin/reports" className={navLinkClass}>
          Reports
        </Link>
        <Link href="/admin/users" className={navLinkClass}>
          Users
        </Link>
        {user.role === "MAIN_ADMIN" && (
          <>
            <Link href="/admin/reviews" className={navLinkClass}>
              Reviews
            </Link>
            <Link href="/admin/admins" className={navLinkClass}>
              Admins
            </Link>
            <Link href="/admin/config" className={navLinkClass}>
              Config
            </Link>
            <Link href="/admin/settings" className={navLinkClass}>
              Settings
            </Link>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
