"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Split out of admin/layout.tsx (Entry 66) — usePathname() for
// active-route highlighting is a client-only hook, and the layout itself
// needs to stay a Server Component for its requireAdmin() check.
const LINKS = [
  { href: "/admin/titles", label: "Titles" },
  { href: "/admin/seals", label: "Seals" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
] as const;

const MAIN_ADMIN_LINKS = [
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/config", label: "Config" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminNav({ isMainAdmin }: { isMainAdmin: boolean }) {
  const pathname = usePathname();
  const links = isMainAdmin ? [...LINKS, ...MAIN_ADMIN_LINKS] : LINKS;

  return (
    <>
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full bg-panel-hover px-3 py-1 text-foreground"
                : "rounded-full px-3 py-1 text-muted transition-colors hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
