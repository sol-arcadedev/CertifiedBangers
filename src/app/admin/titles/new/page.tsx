import Link from "next/link";
import { createTitle } from "@/lib/actions/titles";
import { TitleForm } from "@/components/admin/title-form";

// Fallback for the rare title AniList doesn't have (Journal Entry 44) —
// /admin/titles/import is the primary path.
export default function NewTitlePage() {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
        Add a title manually
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Most titles should come from{" "}
        <Link href="/admin/titles/import" className="underline">
          Import from AniList
        </Link>{" "}
        instead — use this only if it isn&apos;t there.
      </p>
      <TitleForm action={createTitle} submitLabel="Create title" />
    </div>
  );
}
