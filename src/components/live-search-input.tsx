"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 300;

// A single deliberately-composed string rather than appending `pl-9` to
// the caller's className: Tailwind resolves conflicting utilities
// (px-3 vs pl-9) by generated-stylesheet order, not by className string
// order, so composing them via concatenation is fragile. This mirrors
// INPUT from ui-classes.ts with the left padding widened for the icon.
const SEARCH_INPUT_CLASS =
  "w-full rounded-lg border border-border bg-panel py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

// Stays a normal name="q" form field (uncontrolled, defaultValue not
// value) so the page's existing "Apply" button still submits it as part
// of the regular GET form alongside genre/status/sort/etc. On top of
// that, typing debounces into a router.replace() that updates just the
// `q` param — defaultValue means React won't fight the user's typing
// when the resulting server re-render hands back a new initial value.
export function LiveSearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) params.set("q", value);
      else params.delete("q");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Name, genre, author…"
        onChange={(e) => handleChange(e.target.value)}
        className={SEARCH_INPUT_CLASS}
      />
    </div>
  );
}
