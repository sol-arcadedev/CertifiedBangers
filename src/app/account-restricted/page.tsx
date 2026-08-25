import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Not gated by requireUser (that would redirect right back here) — reads
// the session directly instead.
export default async function AccountRestrictedPage() {
  const user = await getCurrentUser();
  if (!user || user.status === "ACTIVE") redirect("/");

  const message =
    user.status === "BANNED"
      ? "Your account has been banned. You can still browse the site, but you can no longer review, comment, vote, report, or manage your library."
      : "Your account has been suspended. You can still browse the site, but you can no longer review, comment, vote, report, or manage your library.";

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Account restricted</h1>
        <p className="mt-4 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
