import { Inbox } from "lucide-react";

// Shared "nothing here yet" treatment (Entry 66) — used wherever a list
// can legitimately be empty (seals, feed, a profile's library sections).
// One consistent icon+message pattern rather than three separately
// hand-rolled ones, matching this file's neighbors in src/lib/ui-classes.ts.
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Inbox aria-hidden="true" className="h-8 w-8 text-muted/60" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
