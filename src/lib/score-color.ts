// Score-tier color for AniList average-score badges — extracted from
// title-card-grid.tsx (Entry 66) so any other spot that needs the same
// score-to-color mapping (e.g. a future title-detail badge) doesn't have
// to re-derive the thresholds.
export function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-500/90 text-emerald-950";
  if (score >= 50) return "bg-amber-400/90 text-amber-950";
  return "bg-rose-500/90 text-rose-950";
}
