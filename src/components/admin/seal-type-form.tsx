"use client";

import { useActionState } from "react";
import type { ConfigActionState } from "@/lib/actions/config";

const inputClass =
  "rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground disabled:opacity-50";

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
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4">
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
        <p className="text-xs text-muted">
          Name is locked — the seal system matches on this exact name.
        </p>
      )}

      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-400">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
