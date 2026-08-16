"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEBOUNCE_MS = 300;

// Stays a normal name="q" form field (uncontrolled, defaultValue not
// value) so the page's existing "Apply" button still submits it as part
// of the regular GET form alongside genre/status/sort/etc. On top of
// that, typing debounces into a router.replace() that updates just the
// `q` param — defaultValue means React won't fight the user's typing
// when the resulting server re-render hands back a new initial value.
export function LiveSearchInput({ defaultValue, className }: { defaultValue: string; className: string }) {
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
    <input
      name="q"
      type="search"
      defaultValue={defaultValue}
      placeholder="Name, genre, author…"
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    />
  );
}
