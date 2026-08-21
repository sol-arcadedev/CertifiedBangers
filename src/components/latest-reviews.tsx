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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <Link
          key={review.id}
          href={`/titles/${review.title.id}`}
          className="group flex gap-4 rounded-xl border border-border bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:bg-panel-hover hover:shadow-lg hover:shadow-black/20"
        >
          {review.title.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.title.coverUrl}
              alt={review.title.name}
              className="h-24 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-24 w-16 shrink-0 rounded-lg bg-panel-hover" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground group-hover:text-accent">
              {review.title.name}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {review.overallScore !== null && (
                <span className="inline-flex items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent">
                  {review.overallScore.toFixed(1)}
                </span>
              )}
              {review.sealAwards.map((award, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="inline-flex items-center rounded-md bg-panel-hover px-1.5 py-0.5 text-xs"
                >
                  {award.sealType.name === "Certified Banger" ? "🏅" : award.sealType.name}
                </span>
              ))}
            </div>
            <div className="mt-1.5 text-xs text-muted">
              <UsernameLabel username={review.user.username} role={review.user.role} />
            </div>
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-foreground/80">
              {review.bodyText}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
