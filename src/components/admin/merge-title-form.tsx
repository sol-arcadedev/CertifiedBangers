"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { mergeTitles, searchTitles } from "@/lib/actions/titles";

type Result = { id: string; name: string; type: string; publicationYear: number | null };

// `id` is the *surviving* title (the one this form lives on). The admin
// searches for the duplicate, which becomes the source (deleted) side of
// the merge — see the sourceId/targetId comment in lib/actions/titles.ts.
export function MergeTitleForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(mergeTitles, undefined);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [duplicate, setDuplicate] = useState<Result | null>(null);
  const [, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      startSearch(async () => {
        const found = await searchTitles(query);
        setResults(found.filter((r) => r.id !== id));
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, id]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Merge "${duplicate?.name}" into this title? Its reviews and library entries move here, and it is permanently deleted.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="targetId" value={id} />
      <input type="hidden" name="sourceId" value={duplicate?.id ?? ""} />

      {duplicate ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground">
          <span>
            Duplicate: <strong>{duplicate.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => setDuplicate(null)}
            className="text-muted underline hover:text-foreground"
          >
            change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search for the duplicate title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground"
          />
          {results.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border bg-panel text-sm">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicate(r);
                      setResults([]);
                    }}
                    className="w-full px-3 py-2 text-left text-foreground hover:bg-panel-hover"
                  >
                    {r.name} ({r.type}
                    {r.publicationYear ? `, ${r.publicationYear}` : ""})
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !duplicate}
        className="self-start rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:bg-panel-hover disabled:opacity-50"
      >
        {pending ? "Merging…" : "Merge duplicate into this title"}
      </button>
    </form>
  );
}
