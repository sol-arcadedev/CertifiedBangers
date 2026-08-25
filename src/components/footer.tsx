import Link from "next/link";

const navLinkClass = "text-sm text-muted transition-colors hover:text-foreground";

// Entry 66: the site had no footer at all before this — minimal and
// honest (brand + the same primary nav Header has), nothing invented.
export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground"
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
        </nav>
      </div>
    </footer>
  );
}
