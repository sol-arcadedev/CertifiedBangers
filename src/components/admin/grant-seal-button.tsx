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
        className="rounded-full border border-black/[.08] px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
      >
        Grant {sealTypeName}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1 rounded-md border border-black/[.08] p-2 dark:border-white/[.145]">
      <textarea
        name="justificationText"
        required
        rows={2}
        placeholder={`Why does this review deserve ${sealTypeName}?`}
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
          {pending ? "Granting…" : `Grant ${sealTypeName}`}
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
