"use client";

import { useActionState } from "react";
import { updateProfileImages } from "@/lib/actions/profile";
import { BUTTON_SECONDARY } from "@/lib/ui-classes";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function ProfileImageForm() {
  const [state, formAction, pending] = useActionState(updateProfileImages, undefined);

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
        Edit profile picture / banner
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Profile picture
          <input name="avatar" type="file" accept={ACCEPT} className="text-sm text-muted" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Banner
          <input name="banner" type="file" accept={ACCEPT} className="text-sm text-muted" />
        </label>
        <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>
          {pending ? "Uploading…" : "Save"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
    </details>
  );
}
