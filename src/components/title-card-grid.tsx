import Link from "next/link";
import { CARD, CARD_HOVER } from "@/lib/ui-classes";
import { scoreColor } from "@/lib/score-color";

type TitleCard = {
  id: string;
  name: string;
  type: string;
  coverUrl: string | null;
  anilistAverageScore: number | null;
  // Optional — the browse page passes these for a richer card; the
  // homepage's simpler queries don't fetch them, and the card still works
  // without.
  reviewCount?: number;
  certifiedBangerCount?: number;
  // Optional (Entry 68) — powers the AniList-style hover popover. Cards
  // rendered without them (a caller whose query doesn't select genres/
  // status) just don't show a popover rather than showing a broken one.
  status?: string;
  genres?: string[];
  // Optional (Entry 71) — same "just don't show it" fallback for a caller
  // whose query doesn't include the relation.
  discoveredByUser?: { username: string } | null;
  // Overrides the default /titles/{id} link — used for titles that
  // aren't in our catalog yet, which link to the AniList preview page
  // instead (src/app/titles/anilist/[anilistId]). Search results look
  // identical either way; only the destination differs.
  href?: string;
};

function formatStatus(status: string): string {
  switch (status) {
    case "ONGOING":
      return "Ongoing";
    case "COMPLETED":
      return "Completed";
    case "HIATUS":
      return "On hiatus";
    case "DROPPED":
      return "Dropped";
    default:
      return status;
  }
}

export function TitleCardGrid({ titles }: { titles: TitleCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {titles.map((title) => {
        const hasPopoverInfo =
          title.status !== undefined ||
          (title.genres?.length ?? 0) > 0 ||
          !!title.discoveredByUser;
        return (
          <Link
            key={title.id}
            href={title.href ?? `/titles/${title.id}`}
            className="group relative block hover:z-20"
          >
            {/* Clipping wrapper for the card's own rounded corners — kept
                separate from the outer Link so the hover popover below
                (a sibling, not a descendant of this) isn't clipped along
                with it. */}
            <div className={`overflow-hidden ${CARD} ${CARD_HOVER}`}>
              <div className="relative aspect-[2/3] w-full bg-panel-hover">
                {title.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={title.coverUrl}
                    alt={title.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                    No cover
                  </div>
                )}
                {/* Bottom gradient — gives the cover art some depth instead
                    of a flat photo pasted into a box, and keeps the score/
                    seal badges legible over busy artwork. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent"
                />
                {title.anilistAverageScore !== null && (
                  <span
                    className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(title.anilistAverageScore)}`}
                  >
                    {title.anilistAverageScore}%
                  </span>
                )}
                {(title.certifiedBangerCount ?? 0) > 0 && (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-2 py-0.5 text-xs shadow-[0_0_10px_rgba(226,163,61,0.5)] ring-2 ring-accent/60 backdrop-blur-sm">
                    <span aria-hidden="true">🏅</span>
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-accent sm:text-sm">
                  {title.name}
                </div>
                <div className="mt-1 text-[11px] text-muted sm:text-xs">
                  {title.type}
                  {title.reviewCount !== undefined && title.reviewCount > 0
                    ? ` · ${title.reviewCount} review${title.reviewCount === 1 ? "" : "s"}`
                    : ""}
                </div>
              </div>
            </div>

            {/* AniList-style hover popover (Entry 68). Anchored to the
                card's own left edge rather than centered — centering a
                wider-than-card panel risks it clipping past the viewport
                edge for cards in the first/last grid column; left-anchored
                only ever overflows to the right, which just overlaps the
                next card while hovering (same trade-off AniList's own
                popover makes) rather than escaping the page. */}
            {hasPopoverInfo && (
              <div
                className={`invisible absolute left-0 top-full z-30 w-56 origin-top translate-y-1 scale-95 border border-border-strong p-3 opacity-0 shadow-2xl shadow-black/50 transition-all duration-150 group-hover:visible group-hover:translate-y-2 group-hover:scale-100 group-hover:opacity-100 ${CARD}`}
              >
                <div className="line-clamp-2 text-sm font-semibold text-foreground">{title.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{title.type}</span>
                  {title.status && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatStatus(title.status)}</span>
                    </>
                  )}
                  {title.anilistAverageScore !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-accent">{title.anilistAverageScore}%</span>
                    </>
                  )}
                </div>
                {title.genres && title.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {title.genres.slice(0, 4).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                {title.discoveredByUser && (
                  <div className="mt-2 text-[11px] text-muted">
                    🏅 Discovered by{" "}
                    <span className="font-medium text-accent">
                      {title.discoveredByUser.username}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
