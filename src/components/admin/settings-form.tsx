"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";

export function SettingsForm({ minAccountAgeDays }: { minAccountAgeDays: number }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Minimum account age before a user&apos;s first review (days)
        <input
          name="minAccountAgeDays"
          type="number"
          min={0}
          required
          defaultValue={minAccountAgeDays}
          className="w-32 rounded-md border border-black/[.08] px-3 py-2 text-base text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        />
      </label>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Email verification is always required before a first review and isn&apos;t configurable
        (Journal Entry 40). This only tunes the account-age part of the gate.
      </p>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="text-sm text-green-700 dark:text-green-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
