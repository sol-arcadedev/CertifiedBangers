"use client";

import { useActionState } from "react";
import type { ConfigActionState } from "@/lib/actions/config";
import { TitleType } from "@/generated/prisma/enums";

const inputClass =
  "rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground";

export type CategoryDefaults = {
  name: string;
  scaleMin: number;
  scaleMax: number;
  appliesToType: string[];
};

export function CategoryForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ConfigActionState, formData: FormData) => Promise<ConfigActionState>;
  defaults?: CategoryDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4">
      <div className="flex gap-3">
        <input name="name" placeholder="Name" required defaultValue={defaults?.name} className={`${inputClass} flex-1`} />
        <input
          name="scaleMin"
          type="number"
          placeholder="Min"
          required
          defaultValue={defaults?.scaleMin ?? 1}
          className={`${inputClass} w-20`}
        />
        <input
          name="scaleMax"
          type="number"
          placeholder="Max"
          required
          defaultValue={defaults?.scaleMax ?? 10}
          className={`${inputClass} w-20`}
        />
      </div>
      <div className="flex gap-4 text-sm text-foreground">
        {Object.values(TitleType).map((t) => (
          <label key={t} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="appliesToType"
              value={t}
              defaultChecked={defaults ? defaults.appliesToType.includes(t) : true}
            />
            {t}
          </label>
        ))}
      </div>

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
