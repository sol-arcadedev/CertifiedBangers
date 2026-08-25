import { CARD } from "@/lib/ui-classes";

// Entry 66: instant skeleton while the server component resolves, instead
// of a blank screen — mirrors the real grid shape in title-card-grid.tsx.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 h-7 w-24 animate-pulse rounded-md bg-panel" />
      <div className="mb-8 h-24 animate-pulse rounded-xl border border-border bg-panel" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`overflow-hidden ${CARD}`}>
            <div className="aspect-[2/3] w-full animate-pulse bg-panel-hover" />
            <div className="space-y-2 p-2.5">
              <div className="h-3.5 w-full animate-pulse rounded bg-panel-hover" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-panel-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
