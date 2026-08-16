"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Something went wrong</h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          An unexpected error occurred. You can try again, or head back to the homepage.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Error ID: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full border border-black/[.08] px-5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
