import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { UsernameLabel } from "@/components/username-label";
import { BUTTON_PRIMARY, BUTTON_GHOST } from "@/lib/ui-classes";

const navLinkClass =
  "text-sm font-medium text-muted transition-colors hover:text-foreground";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background/95 px-4 py-3.5 backdrop-blur sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1.5 font-display text-lg font-bold tracking-tight text-foreground"
      >
        <span className="text-accent">🏅</span>
        CertifiedBanger
      </Link>

      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/titles" className={navLinkClass}>
          Titles
        </Link>
        <Link href="/reviews" className={navLinkClass}>
          Reviews
        </Link>
        <Link href="/seals" className={navLinkClass}>
          Seals
        </Link>
        {user ? (
          <>
            <Link href="/feed" className={navLinkClass}>
              Feed
            </Link>
            {(user.role === "ADMIN" || user.role === "MAIN_ADMIN") && (
              <Link href="/admin/titles" className={navLinkClass}>
                Admin
              </Link>
            )}
            <Link href={`/profile/${user.username}`} className={navLinkClass}>
              <UsernameLabel username={user.username} role={user.role} />
            </Link>
            <form action={signOut}>
              <button type="submit" className={BUTTON_GHOST}>
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className={navLinkClass}>
              Log in
            </Link>
            <Link href="/register" className={BUTTON_PRIMARY}>
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
