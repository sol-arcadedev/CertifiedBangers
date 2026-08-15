"use client";

import { useActionState } from "react";
import { deleteTitle, type TitleActionState } from "@/lib/actions/titles";

export function DeleteTitleButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    deleteTitle.bind(null, id) as (
      state: TitleActionState,
      formData: FormData,
    ) => Promise<TitleActionState>,
    undefined,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Delete this title? This can't be undone.")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? "Deleting…" : "Delete title"}
      </button>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
