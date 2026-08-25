import { CARD } from "@/lib/ui-classes";

// Entry 66: mirrors latest-reviews.tsx's real grid shape.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 h-7 w-28 animate-pulse rounded-md bg-panel" />
      <div className="mb-8 h-24 animate-pulse rounded-xl border border-border bg-panel" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex gap-4 p-4 ${CARD}`}>
            <div className="h-24 w-16 shrink-0 animate-pulse rounded-lg bg-panel-hover" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-panel-hover" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-panel-hover" />
              <div className="h-3 w-full animate-pulse rounded bg-panel-hover" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-panel-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
