"use client";

import { useActionState } from "react";
import { submitComment } from "@/lib/actions/comments";
import { INPUT, BUTTON_SECONDARY } from "@/lib/ui-classes";

export function CommentForm({ reviewId, titleId }: { reviewId: string; titleId: string }) {
  const [state, formAction, pending] = useActionState(
    submitComment.bind(null, reviewId, titleId),
    undefined,
  );

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <textarea name="bodyText" required rows={2} placeholder="Add a comment…" className={INPUT} />
      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`self-start text-xs ${BUTTON_SECONDARY}`}>
        {pending ? "Posting…" : "Comment"}
      </button>
    </form>
  );
}
