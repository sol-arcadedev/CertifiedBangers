import Link from "next/link";
import { UsernameLabel } from "@/components/username-label";

type LatestReview = {
  id: string;
  bodyText: string;
  overallScore: number | null;
  title: { id: string; name: string; coverUrl: string | null };
  user: { username: string; role: string };
  sealAwards: { sealType: { name: string } }[];
};

export function LatestReviews({ reviews }: { reviews: LatestReview[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <Link
          key={review.id}
          href={`/titles/${review.title.id}`}
          className="group flex gap-3 rounded-xl border border-border bg-panel p-3 transition-all hover:border-border-strong hover:bg-panel-hover"
        >
          {review.title.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.title.coverUrl}
              alt={review.title.name}
              className="h-20 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-20 w-14 shrink-0 rounded-lg bg-panel-hover" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-sm font-medium text-foreground group-hover:text-accent">
                {review.title.name}
              </div>
              {review.overallScore !== null && (
                <span className="shrink-0 text-sm font-semibold text-accent">
                  {review.overallScore.toFixed(1)}
                </span>
              )}
            </div>
            <div className="text-xs text-muted">
              <UsernameLabel username={review.user.username} role={review.user.role} />
            </div>
            {review.sealAwards.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {review.sealAwards.map((award, i) => (
                  <span key={i} aria-hidden="true" className="text-xs">
                    {award.sealType.name === "Certified Banger" ? "🏅" : "💎"}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/80">
              {review.bodyText}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
