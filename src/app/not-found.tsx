import Link from "next/link";
import { BUTTON_PRIMARY } from "@/lib/ui-classes";

// Renders inside the root layout (Header, styles, dark mode all still
// apply) — this is the standard app/not-found.tsx, not the experimental
// global-not-found.js, since this project has a single root layout with
// no top-level dynamic segments. Handles both explicit notFound() calls
// (e.g. requireAdmin() hiding admin routes from non-admins behind a 404
// rather than a 403, so it can't leak route existence) and genuinely
// unmatched URLs.
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-4 text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or isn&apos;t available.
        </p>
        <Link href="/" className={`mt-6 ${BUTTON_PRIMARY}`}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
