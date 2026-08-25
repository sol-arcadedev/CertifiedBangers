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
  // Overrides the default /titles/{id} link — used for titles that
  // aren't in our catalog yet, which link to the AniList preview page
  // instead (src/app/titles/anilist/[anilistId]). Search results look
  // identical either way; only the destination differs.
  href?: string;
};

export function TitleCardGrid({ titles }: { titles: TitleCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {titles.map((title) => (
        <Link
          key={title.id}
          href={title.href ?? `/titles/${title.id}`}
          className={`group overflow-hidden ${CARD} ${CARD_HOVER}`}
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-panel-hover">
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
            {/* Bottom gradient — gives the cover art some depth instead of
                a flat photo pasted into a box, and keeps the score/seal
                badges legible over busy artwork. */}
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
          <div className="p-2.5">
            <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-accent">
              {title.name}
            </div>
            <div className="mt-1 text-xs text-muted">
              {title.type}
              {title.reviewCount !== undefined && title.reviewCount > 0
                ? ` · ${title.reviewCount} review${title.reviewCount === 1 ? "" : "s"}`
                : ""}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
