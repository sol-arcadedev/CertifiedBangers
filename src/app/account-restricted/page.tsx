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
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Account restricted</h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
