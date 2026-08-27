// Score-tier styling for AniList average-score badges — extracted from
// title-card-grid.tsx (Entry 66) so any other spot that needs the same
// score-to-color mapping doesn't have to re-derive the thresholds. Entry
// 67: returns a full badge treatment (fill + glow ring) rather than just
// a background/text pair, since a flat colored rectangle read as a plain
// data label rather than a rating worth noticing.
// Tiered treatment for this platform's own /5 review scores (Entry 80) —
// previously every review score badge was the same flat accent pill
// regardless of whether it was a 5.0 or a 2.5, which was a big part of the
// "everything is one muted color" complaint the bold-palette pass set out
// to fix. Lighter-weight than scoreColor's cover-image glow treatment
// (a plain ring instead of an outer shadow) since these sit inline in
// dense review lists rather than as a standalone corner badge.
export function reviewScoreColor(score: number, max = 5): string {
  const pct = score / max;
  if (pct >= 0.75) {
    return "bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30";
  }
  if (pct >= 0.5) {
    return "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30";
  }
  return "bg-rose-400/15 text-rose-400 ring-1 ring-rose-400/30";
}

export function scoreColor(score: number): string {
  if (score >= 75) {
    return "bg-emerald-400 text-emerald-950 ring-2 ring-emerald-200/60 shadow-[0_0_14px_rgba(52,211,153,0.7)]";
  }
  if (score >= 50) {
    return "bg-amber-400 text-amber-950 ring-2 ring-amber-200/60 shadow-[0_0_14px_rgba(251,191,36,0.7)]";
  }
  return "bg-rose-500 text-rose-950 ring-2 ring-rose-300/60 shadow-[0_0_14px_rgba(244,63,94,0.65)]";
}
