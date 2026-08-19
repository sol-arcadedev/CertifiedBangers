"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/ui-classes";

// Catches uncaught exceptions anywhere below the root layout (any
// page/nested layout) — the Header above it keeps rendering since error.js
// doesn't wrap the layout.js above it in the same segment (Next.js docs,
// file-conventions/error). Doesn't catch errors in the root layout itself
// (e.g. Header's own data fetching) — that's global-error.tsx's job.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-4 text-sm text-muted">
          An unexpected error occurred. You can try again, or head back to the homepage.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted">Error ID: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => retry()} className={BUTTON_PRIMARY}>
            Try again
          </button>
          <Link href="/" className={BUTTON_SECONDARY}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
