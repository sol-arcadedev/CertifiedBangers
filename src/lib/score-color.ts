// Score-tier styling for AniList average-score badges — extracted from
// title-card-grid.tsx (Entry 66) so any other spot that needs the same
// score-to-color mapping doesn't have to re-derive the thresholds. Entry
// 67: returns a full badge treatment (fill + glow ring) rather than just
// a background/text pair, since a flat colored rectangle read as a plain
// data label rather than a rating worth noticing.
export function scoreColor(score: number): string {
  if (score >= 75) {
    return "bg-emerald-500 text-emerald-950 ring-2 ring-emerald-300/50 shadow-[0_0_10px_rgba(16,185,129,0.55)]";
  }
  if (score >= 50) {
    return "bg-amber-400 text-amber-950 ring-2 ring-amber-200/50 shadow-[0_0_10px_rgba(251,191,36,0.55)]";
  }
  return "bg-rose-500 text-rose-950 ring-2 ring-rose-300/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]";
}
