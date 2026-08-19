"use client";

import { useTransition } from "react";
import { setLibraryStatusForAniListTitle } from "@/lib/actions/library";
import type { LibraryStatus } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<LibraryStatus, string> = {
  FINISHED: "Finished",
  CURRENTLY_READING: "Currently Reading",
  PLAN_TO_READ: "Plan to Read",
  DROPPED: "Dropped",
};

// Same as LibraryWidget, but for a title not in our catalog yet — no
// "remove" option (there's nothing to remove until it's actually
// imported), and picking a status imports the title first, then
// redirects to its new real page.
export function AniListLibraryWidget({ anilistId }: { anilistId: number }) {
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (!value) return;
    startTransition(() => {
      setLibraryStatusForAniListTitle(anilistId, value as LibraryStatus);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      Library
      <select
        defaultValue=""
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-border bg-panel px-2 py-1 text-sm text-foreground disabled:opacity-50"
      >
        <option value="" disabled>
          Add to library…
        </option>
        {(Object.entries(STATUS_LABELS) as [LibraryStatus, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
