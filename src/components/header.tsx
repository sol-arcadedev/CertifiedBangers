import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="flex items-center justify-between border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-black">
      <Link
        href="/"
        className="text-lg font-semibold text-black dark:text-zinc-50"
      >
        CertifiedBanger
      </Link>

      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/titles" className="text-zinc-700 dark:text-zinc-300">
          Titles
        </Link>
        {user ? (
          <>
            {(user.role === "ADMIN" || user.role === "MAIN_ADMIN") && (
              <Link href="/admin/titles" className="text-zinc-700 dark:text-zinc-300">
                Admin
              </Link>
            )}
            <Link
              href={`/profile/${user.username}`}
              className="text-zinc-700 dark:text-zinc-300"
            >
              {user.username}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-zinc-700 dark:text-zinc-300"
              >
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-zinc-700 dark:text-zinc-300">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-foreground px-4 py-1.5 text-background"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
