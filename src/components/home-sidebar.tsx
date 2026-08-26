import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { CARD } from "@/lib/ui-classes";
import { formatRelativeTime } from "@/lib/relative-time";

type RecentSeal = {
  id: string;
  name: string;
  coverUrl: string | null;
  discoveredAt: Date | null;
};

export function HomeSidebar({
  discordHref,
  recentSeals,
}: {
  discordHref: string;
  recentSeals: RecentSeal[];
}) {
  return (
    <aside className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
      <Link
        href={discordHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-accent-hover to-accent px-4 py-3 text-sm font-medium text-accent-foreground shadow-[0_4px_14px_-4px_rgba(226,163,61,0.5)] transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <MessageSquare aria-hidden="true" className="h-5 w-5 shrink-0" />
        Join Discord Community
      </Link>

      {recentSeals.length > 0 && (
        <div className={`p-4 ${CARD}`}>
          <h2 className="font-display text-sm font-bold text-foreground">
            🏅 Recently Gained Certified Bangers
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {recentSeals.map((title) => (
              <li key={title.id}>
                <Link
                  href={`/titles/${title.id}`}
                  className="group flex items-center gap-2.5 rounded-lg transition-colors hover:bg-panel-hover"
                >
                  {title.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={title.coverUrl}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-14 w-10 shrink-0 rounded-md bg-panel-hover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-accent">
                      {title.name}
                    </div>
                    {title.discoveredAt && (
                      <div className="mt-0.5 text-[11px] text-muted">
                        {formatRelativeTime(title.discoveredAt)}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
