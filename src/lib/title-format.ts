// Shared by the real title page and the AniList preview page (for titles
// not yet imported) — both render the same "Status/Start Date/Source/etc."
// details grid from slightly different data sources.
export function formatStartDate(year: number | null, month: number | null, day: number | null) {
  if (!year) return null;
  if (month && day) {
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (month) {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return String(year);
}

export function formatSource(source: string | null) {
  if (!source) return null;
  return source
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
