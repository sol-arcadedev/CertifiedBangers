"use client";

import { useTransition } from "react";
import { setLibraryStatus, removeFromLibrary } from "@/lib/actions/library";
import type { LibraryStatus } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<LibraryStatus, string> = {
  FINISHED: "Finished",
  CURRENTLY_READING: "Currently Reading",
  PLAN_TO_READ: "Plan to Read",
  DROPPED: "Dropped",
};

export function LibraryWidget({
  titleId,
  currentStatus,
}: {
  titleId: string;
  currentStatus: LibraryStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(() => {
      if (value === "") {
        removeFromLibrary(titleId);
      } else {
        setLibraryStatus(titleId, value as LibraryStatus);
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      Library
      <select
        defaultValue={currentStatus ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="rounded-md border border-black/[.08] px-2 py-1 text-sm text-black disabled:opacity-50 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
      >
        <option value="">Not in library</option>
        {(Object.entries(STATUS_LABELS) as [LibraryStatus, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
