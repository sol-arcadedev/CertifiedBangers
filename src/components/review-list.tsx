import Link from "next/link";
import { UsernameLabel } from "@/components/username-label";
import { formatRelativeTime } from "@/lib/relative-time";
import { CARD, CARD_HOVER } from "@/lib/ui-classes";
import { reviewScoreColor } from "@/lib/score-color";

type ReviewListItem = {
  id: string;
  bodyText: string;
  overallScore: number | null;
  createdAt: Date;
  title: { id: string; name: string; coverUrl: string | null };
  user: { username: string; role: string };
  sealAwards: { sealType: { name: string } }[];
};

// Full single-column list for the dedicated /reviews browse page — reviews
// there are the primary content, not a compact preview, so each one gets
// real breathing room (bigger cover, more excerpt lines, clear visual
// separation) instead of competing for space in a dense multi-column grid.
// The homepage's LatestReviews component is a deliberately compact teaser
// strip and stays as-is; this is a separate component, not a shared one
// with a density flag, since the two contexts want genuinely different
// layouts rather than a tweaked version of the same one.
export function ReviewList({ reviews }: { reviews: ReviewListItem[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {reviews.map((review) => (
        <li key={review.id} className={`animate-reveal-on-scroll overflow-hidden ${CARD} ${CARD_HOVER}`}>
          <Link href={`/titles/${review.title.id}`} className="group flex gap-4 p-4 sm:gap-5 sm:p-5">
            <div className="w-20 shrink-0 sm:w-24">
              {review.title.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.title.coverUrl}
                  alt={review.title.name}
                  className="aspect-[2/3] w-full rounded-lg object-cover"
                />
              ) : (
                <div className="aspect-[2/3] w-full rounded-lg bg-panel-hover" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <h3 className="font-display text-base font-bold leading-tight text-foreground group-hover:text-accent">
                  {review.title.name}
                </h3>
                {review.overallScore !== null && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold ${reviewScoreColor(review.overallScore)}`}
                  >
                    {review.overallScore.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <UsernameLabel username={review.user.username} role={review.user.role} />
                <span aria-hidden="true">·</span>
                <span>{formatRelativeTime(review.createdAt)}</span>
                {review.sealAwards.map((award, i) => {
                  const isCertifiedBanger = award.sealType.name === "Certified Banger";
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isCertifiedBanger ? "bg-accent/15 text-accent" : "bg-sky-400/15 text-sky-400"}`}
                    >
                      {isCertifiedBanger ? "🏅" : "💎"} {award.sealType.name}
                    </span>
                  );
                })}
              </div>

              <p className="mt-2.5 line-clamp-3 text-sm leading-6 text-foreground/80 sm:line-clamp-4">
                {review.bodyText}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
