"use client";

import { useActionState, useState } from "react";
import { submitReport } from "@/lib/actions/reports";

const FOCUS_RING_XS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

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
        className={`text-xs text-muted underline hover:text-foreground ${FOCUS_RING_XS}`}
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
        className="rounded-lg border border-border bg-panel px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {state?.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        {/* Small pill treatment matching the button visual language rather
            than composed from BUTTON_PRIMARY — that constant bakes in
            px-5 py-2 text-sm, which conflicts with this widget's
            deliberately compact text-xs context. */}
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex items-center justify-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none ${FOCUS_RING_XS}`}
        >
          {pending ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`text-xs text-muted hover:text-foreground ${FOCUS_RING_XS}`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
