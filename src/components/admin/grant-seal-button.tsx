"use client";

import { useActionState, useState } from "react";
import { grantSeal } from "@/lib/actions/seals";

export function GrantSealButton({
  reviewId,
  sealTypeId,
  sealTypeName,
}: {
  reviewId: string;
  sealTypeId: string;
  sealTypeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    grantSeal.bind(null, reviewId, sealTypeId),
    undefined,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border-strong px-3 py-1 text-xs text-foreground"
      >
        Grant {sealTypeName}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1 rounded-xl border border-border bg-panel p-2">
      <textarea
        name="justificationText"
        required
        rows={2}
        placeholder={`Why does this review deserve ${sealTypeName}?`}
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
          {pending ? "Granting…" : `Grant ${sealTypeName}`}
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
