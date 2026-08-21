"use client";

import { useActionState } from "react";
import type { TitleActionState } from "@/lib/actions/titles";

// For AniList-linked titles (Entry 52): name/genres/synopsis/status/etc.
// are fetched live and no longer stored locally, so there's nothing left
// to edit here except the cover — everything else that TitleForm exposes
// for manual titles doesn't apply.
export function CoverOnlyForm({
  action,
  coverUrl,
}: {
  action: (state: TitleActionState, formData: FormData) => Promise<TitleActionState>;
  coverUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        This title&apos;s details (name, genres, synopsis, status, scores, etc.) are fetched live
        from AniList and can&apos;t be edited here — only the cover image is stored locally.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        {coverUrl ? "Replace cover image" : "Cover image"}
        <input name="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </label>

      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="Current cover" className="h-40 w-28 rounded object-cover" />
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.message && <p className="text-sm text-emerald-400">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-accent text-accent-foreground font-medium transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
