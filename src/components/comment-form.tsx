"use client";

import { useActionState } from "react";
import { submitComment } from "@/lib/actions/comments";

export function CommentForm({ reviewId, titleId }: { reviewId: string; titleId: string }) {
  const [state, formAction, pending] = useActionState(
    submitComment.bind(null, reviewId, titleId),
    undefined,
  );

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <textarea
        name="bodyText"
        required
        rows={2}
        placeholder="Add a comment…"
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
      />
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full border border-black/[.08] px-4 py-1 text-sm text-zinc-700 disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-300"
      >
        {pending ? "Posting…" : "Comment"}
      </button>
    </form>
  );
}
