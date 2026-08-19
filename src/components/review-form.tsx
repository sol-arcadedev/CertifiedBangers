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
    spoilerFlag: boolean;
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

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="spoilerFlag"
          defaultChecked={existingReview?.spoilerFlag}
        />
        Contains spoilers
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
