"use client";

import { useActionState } from "react";
import type { ReviewActionState } from "@/lib/actions/reviews";
import { INPUT, LABEL, BUTTON_PRIMARY } from "@/lib/ui-classes";

type Category = { id: string; name: string; scaleMin: number; scaleMax: number };

export function ReviewForm({
  action,
  categories,
  existingReview,
}: {
  action: (state: ReviewActionState, formData: FormData) => Promise<ReviewActionState>;
  categories: Category[];
  existingReview?: {
    bodyText: string;
    spoilerText: string | null;
    scores: Record<string, number>;
  };
}) {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.map((category) => (
          <label key={category.id} className={LABEL}>
            {category.name}
            <select
              name={`score_${category.id}`}
              required
              defaultValue={existingReview?.scores[category.id] ?? ""}
              className={INPUT}
            >
              <option value="" disabled>
                Rate…
              </option>
              {Array.from(
                { length: category.scaleMax - category.scaleMin + 1 },
                (_, i) => category.scaleMin + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className={LABEL}>
        Review
        <textarea
          name="bodyText"
          required
          minLength={50}
          rows={6}
          defaultValue={existingReview?.bodyText}
          placeholder="What did you think? (min 50 characters)"
          className={INPUT}
        />
      </label>
      <p className="-mt-2 text-xs text-muted">
        Keep this field spoiler-free — describe plot specifics in the spoiler field below instead.
        Reviews with unhidden spoilers in the main text will be removed.
      </p>

      <label className={LABEL}>
        Spoiler details (optional)
        <textarea
          name="spoilerText"
          rows={4}
          defaultValue={existingReview?.spoilerText ?? ""}
          placeholder="Anything spoiler-specific goes here — hidden behind a click-to-reveal by default."
          className={INPUT}
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`self-start ${BUTTON_PRIMARY}`}>
        {pending ? "Saving…" : existingReview ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
