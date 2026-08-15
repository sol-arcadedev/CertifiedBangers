import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { AniListImport } from "@/components/admin/anilist-import";

export default async function ImportTitlePage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
        Import from AniList
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Primary way to add titles (Journal Entry 44) — metadata and cover art come from AniList.
        Can&apos;t find it there?{" "}
        <Link href="/admin/titles/new" className="underline">
          Add it manually
        </Link>{" "}
        instead.
      </p>
      <AniListImport />
    </div>
  );
}
