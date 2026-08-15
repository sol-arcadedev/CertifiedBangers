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
        <div className="flex items-center justify-between rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]">
          <span>
            Duplicate: <strong>{duplicate.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => setDuplicate(null)}
            className="text-zinc-500 underline"
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
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          />
          {results.length > 0 && (
            <ul className="divide-y divide-black/[.08] rounded-md border border-black/[.08] text-sm dark:divide-white/[.145] dark:border-white/[.145]">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicate(r);
                      setResults([]);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-black/[.03] dark:hover:bg-white/[.05]"
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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !duplicate}
        className="self-start rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.05]"
      >
        {pending ? "Merging…" : "Merge duplicate into this title"}
      </button>
    </form>
  );
}
