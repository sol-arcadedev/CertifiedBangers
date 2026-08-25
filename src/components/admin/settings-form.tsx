"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";
import { LABEL, INPUT, BUTTON_PRIMARY } from "@/lib/ui-classes";

export function SettingsForm({
  minAccountAgeDays,
  sealQualityGateThreshold,
  reviewRateLimitPerHour,
  commentRateLimitPerHour,
  voteRateLimitPerHour,
  reportRateLimitPerHour,
}: {
  minAccountAgeDays: number;
  sealQualityGateThreshold: number;
  reviewRateLimitPerHour: number;
  commentRateLimitPerHour: number;
  voteRateLimitPerHour: number;
  reportRateLimitPerHour: number;
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={LABEL}>
        Minimum account age before a user&apos;s first review (days)
        {/* INPUT includes w-full — constraining the wrapper's width keeps
            these intentionally-narrow number fields narrow without fighting
            Tailwind utility ordering by concatenating a conflicting w-*. */}
        <div className="w-32">
          <input
            name="minAccountAgeDays"
            type="number"
            min={0}
            required
            defaultValue={minAccountAgeDays}
            className={INPUT}
          />
        </div>
      </label>
      <p className="text-sm text-muted">
        Email verification is always required before a first review and isn&apos;t configurable
        (Journal Entry 40). This only tunes the account-age part of the gate.
      </p>

      <label className={LABEL}>
        Seal quality-gate threshold (net votes)
        <div className="w-32">
          <input
            name="sealQualityGateThreshold"
            type="number"
            min={1}
            required
            defaultValue={sealQualityGateThreshold}
            className={INPUT}
          />
        </div>
      </label>
      <p className="text-sm text-muted">
        Net vote score (upvotes minus downvotes) a review needs to automatically earn Certified
        Banger (Journal Entry 8/29 — starting value +20).
      </p>

      <h2 className="mt-2 text-base font-semibold text-foreground">
        Rate limits (WP6.2 spam mitigation)
      </h2>
      <p className="-mt-2 text-sm text-muted">
        Per-user cap over a fixed 1-hour window. Reviews count new submissions only (not edits);
        votes count new votes only (not undoing/switching an existing one).
      </p>

      <label className={LABEL}>
        New reviews per hour
        <div className="w-32">
          <input
            name="reviewRateLimitPerHour"
            type="number"
            min={1}
            required
            defaultValue={reviewRateLimitPerHour}
            className={INPUT}
          />
        </div>
      </label>

      <label className={LABEL}>
        Comments per hour
        <div className="w-32">
          <input
            name="commentRateLimitPerHour"
            type="number"
            min={1}
            required
            defaultValue={commentRateLimitPerHour}
            className={INPUT}
          />
        </div>
      </label>

      <label className={LABEL}>
        Votes per hour
        <div className="w-32">
          <input
            name="voteRateLimitPerHour"
            type="number"
            min={1}
            required
            defaultValue={voteRateLimitPerHour}
            className={INPUT}
          />
        </div>
      </label>

      <label className={LABEL}>
        Reports per hour
        <div className="w-32">
          <input
            name="reportRateLimitPerHour"
            type="number"
            min={1}
            required
            defaultValue={reportRateLimitPerHour}
            className={INPUT}
          />
        </div>
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.message && <p className="text-sm text-success">{state.message}</p>}

      <button type="submit" disabled={pending} className={`self-start ${BUTTON_PRIMARY}`}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
