import Link from "next/link";

// Renders inside the root layout (Header, styles, dark mode all still
// apply) — this is the standard app/not-found.tsx, not the experimental
// global-not-found.js, since this project has a single root layout with
// no top-level dynamic segments. Handles both explicit notFound() calls
// (e.g. requireAdmin() hiding admin routes from non-admins behind a 404
// rather than a 403, so it can't leak route existence) and genuinely
// unmatched URLs.
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Page not found</h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or isn&apos;t available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
