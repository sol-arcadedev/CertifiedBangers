"use client";

import { useState } from "react";

// Generic star-rating input: renders max-min+1 stars driven entirely by the
// category's configured scale (still data-driven, Entry 2/49 — nothing here
// hardcodes "5"). Hovering previews the fill up to that star; clicking
// commits the value into a hidden input, since a set of <button>s has no
// native form value the way a <select> does.
export function StarRating({
  name,
  min,
  max,
  defaultValue,
}: {
  name: string;
  min: number;
  max: number;
  defaultValue?: number;
}) {
  const [selected, setSelected] = useState<number | null>(defaultValue ?? null);
  const [hovered, setHovered] = useState<number | null>(null);
  const stars = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const displayValue = hovered ?? selected;

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHovered(null)}
      role="radiogroup"
      aria-label={`Rating, ${min} to ${max} stars`}
    >
      <input type="hidden" name={name} value={selected ?? ""} />
      {stars.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={selected === value}
          aria-label={`${value} out of ${max} stars`}
          onMouseEnter={() => setHovered(value)}
          onFocus={() => setHovered(value)}
          onBlur={() => setHovered(null)}
          onClick={() => setSelected(value)}
          className="text-2xl leading-none transition-colors"
        >
          <span
            className={
              displayValue !== null && value <= displayValue ? "text-accent" : "text-muted"
            }
          >
            ★
          </span>
        </button>
      ))}
      <span className="ml-1 text-xs text-muted">{selected ?? "–"}/{max}</span>
    </div>
  );
}
