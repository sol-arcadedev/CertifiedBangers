"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";

export function SettingsForm({
  minAccountAgeDays,
  sealQualityGateThreshold,
  sealPopularityGateThreshold,
  reviewRateLimitPerHour,
  commentRateLimitPerHour,
  voteRateLimitPerHour,
  reportRateLimitPerHour,
}: {
  minAccountAgeDays: number;
  sealQualityGateThreshold: number;
  sealPopularityGateThreshold: number;
  reviewRateLimitPerHour: number;
  commentRateLimitPerHour: number;
  voteRateLimitPerHour: number;
  reportRateLimitPerHour: number;
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Minimum account age before a user&apos;s first review (days)
        <input
          name="minAccountAgeDays"
          type="number"
          min={0}
          required
          defaultValue={minAccountAgeDays}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>
      <p className="text-sm text-muted">
        Email verification is always required before a first review and isn&apos;t configurable
        (Journal Entry 40). This only tunes the account-age part of the gate.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Seal quality-gate threshold (net votes)
        <input
          name="sealQualityGateThreshold"
          type="number"
          min={1}
          required
          defaultValue={sealQualityGateThreshold}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>
      <p className="text-sm text-muted">
        Net vote score (upvotes minus downvotes) a review needs to automatically become a seal
        candidate (Journal Entry 8/29 — starting value +20). Which seal it earns depends on the
        popularity threshold below.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Seal popularity-gate threshold (total votes)
        <input
          name="sealPopularityGateThreshold"
          type="number"
          min={1}
          required
          defaultValue={sealPopularityGateThreshold}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>
      <p className="text-sm text-muted">
        Total votes (up+down) on a title&apos;s highest-voted review. Below this, a
        quality-gate-crossing review earns Hidden Gem; at or above it, Certified Banger instead
        (Journal Entry 15/29 — starting value 100). Certified Banger doesn&apos;t remove an
        already-earned Hidden Gem.
      </p>

      <h2 className="mt-2 text-base font-semibold text-foreground">
        Rate limits (WP6.2 spam mitigation)
      </h2>
      <p className="-mt-2 text-sm text-muted">
        Per-user cap over a fixed 1-hour window. Reviews count new submissions only (not edits);
        votes count new votes only (not undoing/switching an existing one).
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        New reviews per hour
        <input
          name="reviewRateLimitPerHour"
          type="number"
          min={1}
          required
          defaultValue={reviewRateLimitPerHour}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Comments per hour
        <input
          name="commentRateLimitPerHour"
          type="number"
          min={1}
          required
          defaultValue={commentRateLimitPerHour}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Votes per hour
        <input
          name="voteRateLimitPerHour"
          type="number"
          min={1}
          required
          defaultValue={voteRateLimitPerHour}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Reports per hour
        <input
          name="reportRateLimitPerHour"
          type="number"
          min={1}
          required
          defaultValue={reportRateLimitPerHour}
          className="w-32 rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="text-sm text-emerald-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-6 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
