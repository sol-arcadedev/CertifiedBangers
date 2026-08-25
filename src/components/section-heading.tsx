import Link from "next/link";
import type { ReactNode } from "react";
import { LINK } from "@/lib/ui-classes";

// Entry 67 — a small vertical accent bar + the display typeface turns a
// plain bold label into a real section header instead of looking like
// every other line of bold text on the page.
export function SectionHeading({
  children,
  emoji,
  href,
  hrefLabel = "View all",
}: {
  children: ReactNode;
  emoji?: string;
  href: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-foreground">
        <span aria-hidden="true" className="h-5 w-1 rounded-full bg-accent" />
        {emoji && <span aria-hidden="true">{emoji}</span>}
        {children}
      </h2>
      <Link href={href} className={`text-sm ${LINK}`}>
        {hrefLabel}
      </Link>
    </div>
  );
}
