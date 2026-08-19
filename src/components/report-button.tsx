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
    return <span className="text-xs text-muted">{state.message}</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline hover:text-foreground"
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
        className="rounded-lg border border-border bg-panel px-2 py-1 text-xs text-foreground"
      />
      {state?.error && (
        <p role="alert" className="text-xs text-red-400">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-accent underline disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
