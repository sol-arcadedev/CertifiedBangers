const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_CUTOFF_DAYS = 30;

// Pure — used by the homepage sidebar's "Recently gained Certified Bangers"
// list (Entry 77) and the /reviews page's review feed (Entry 78). The rest
// of the app keeps its existing absolute-date convention (toLocaleDateString)
// everywhere else; this is additive for "recent activity" feeds specifically,
// where relative time genuinely reads better.
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;

  const days = Math.floor(diffMs / DAY_MS);
  if (days < RELATIVE_CUTOFF_DAYS) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
