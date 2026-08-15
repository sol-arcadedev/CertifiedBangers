"use client";

import { useActionState } from "react";
import type { ConfigActionState } from "@/lib/actions/config";

const inputClass =
  "rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50 disabled:opacity-50";

export type SealTypeDefaults = {
  name: string;
  description: string | null;
  icon: string | null;
};

export function SealTypeForm({
  action,
  defaults,
  submitLabel,
  nameLocked,
}: {
  action: (state: ConfigActionState, formData: FormData) => Promise<ConfigActionState>;
  defaults?: SealTypeDefaults;
  submitLabel: string;
  nameLocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex gap-3">
        <input
          name="name"
          placeholder="Name"
          required
          disabled={nameLocked}
          defaultValue={defaults?.name}
          className={`${inputClass} flex-1`}
        />
        <input
          name="icon"
          placeholder="Icon (optional)"
          defaultValue={defaults?.icon ?? ""}
          className={`${inputClass} w-32`}
        />
      </div>
      <textarea
        name="description"
        placeholder="Description (optional)"
        defaultValue={defaults?.description ?? ""}
        rows={2}
        className={inputClass}
      />
      {nameLocked && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Name is locked — the seal system matches on this exact name.
        </p>
      )}

      {state?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700 dark:text-green-400">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
