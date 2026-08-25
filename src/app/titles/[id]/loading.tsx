import { CARD } from "@/lib/ui-classes";

// Entry 66: mirrors the real page's cover+info header, then a couple of
// review-shaped placeholders below.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-48 w-32 shrink-0 animate-pulse rounded-xl bg-panel" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-2/3 animate-pulse rounded-md bg-panel" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-panel" />
          <div className="h-3.5 w-full animate-pulse rounded bg-panel" />
          <div className="h-3.5 w-full animate-pulse rounded bg-panel" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-panel" />
        </div>
      </div>

      <div className="mt-10 space-y-4 border-t border-border pt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`space-y-2 p-4 ${CARD}`}>
            <div className="h-4 w-1/4 animate-pulse rounded bg-panel-hover" />
            <div className="h-3.5 w-full animate-pulse rounded bg-panel-hover" />
            <div className="h-3.5 w-full animate-pulse rounded bg-panel-hover" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-panel-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
