"use client";

import { useActionState, useState } from "react";
import { submitReport } from "@/lib/actions/reports";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "REVIEW" | "COMMENT" | "TITLE";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitReport.bind(null, targetType, targetId),
    undefined,
  );

  if (state?.message) {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">{state.message}</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        Report
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-1 flex flex-col gap-1">
      <textarea
        name="reason"
        required
        rows={2}
        placeholder="Why are you reporting this?"
        className="rounded-md border border-black/[.08] px-2 py-1 text-xs text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
      />
      {state?.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-zinc-700 underline disabled:opacity-50 dark:text-zinc-300"
        >
          {pending ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
