"use client";

import { useActionState } from "react";
import { submitReview, type ReviewActionState } from "@/lib/actions/reviews";

const inputClass =
  "rounded-md border border-black/[.08] px-3 py-2 text-base text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300";

type Category = { id: string; name: string; scaleMin: number; scaleMax: number };

export function ReviewForm({
  titleId,
  categories,
  existingReview,
}: {
  titleId: string;
  categories: Category[];
  existingReview?: {
    bodyText: string;
    spoilerFlag: boolean;
    scores: Record<string, number>;
  };
}) {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    submitReview.bind(null, titleId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.map((category) => (
          <label key={category.id} className={labelClass}>
            {category.name}
            <select
              name={`score_${category.id}`}
              required
              defaultValue={existingReview?.scores[category.id] ?? ""}
              className={inputClass}
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

      <label className={labelClass}>
        Review
        <textarea
          name="bodyText"
          required
          minLength={50}
          rows={6}
          defaultValue={existingReview?.bodyText}
          placeholder="What did you think? (min 50 characters)"
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="spoilerFlag"
          defaultChecked={existingReview?.spoilerFlag}
        />
        Contains spoilers
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending ? "Saving…" : existingReview ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
