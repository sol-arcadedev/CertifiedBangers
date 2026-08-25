import { requireAdmin } from "@/lib/require-admin";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border bg-panel px-4 py-3 text-sm font-medium sm:px-6">
        <span className="mr-2 text-muted">Admin</span>
        <AdminNav isMainAdmin={user.role === "MAIN_ADMIN"} />
      </div>
      {children}
    </div>
  );
}
