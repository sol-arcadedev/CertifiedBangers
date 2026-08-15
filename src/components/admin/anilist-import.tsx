"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchAniList, importAniListTitle } from "@/lib/actions/anilist-import";

type Result = Awaited<ReturnType<typeof searchAniList>>[number];

export function AniListImport() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [, startSearch] = useTransition();
  const [isImporting, startImport] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      startSearch(async () => {
        const found = await searchAniList(query);
        setResults(found);
      });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleImport(anilistId: number) {
    setError(null);
    setImportingId(anilistId);
    startImport(async () => {
      const result = await importAniListTitle(anilistId);
      if (result?.error) {
        setError(result.error);
        setImportingId(null);
      }
      // No error means importAniListTitle already redirected.
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Search AniList by title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-md border border-black/[.08] px-3 py-2 text-base text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="flex flex-col gap-3">
        {results.map((r) => (
          <li
            key={r.anilistId}
            className="flex items-center gap-3 rounded-md border border-black/[.08] p-3 dark:border-white/[.145]"
          >
            {r.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.coverImageUrl}
                alt={r.name}
                className="h-16 w-11 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-16 w-11 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
            )}
            <div className="flex-1">
              <div className="font-medium text-black dark:text-zinc-50">{r.name}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {r.type}
                {r.publicationYear ? ` · ${r.publicationYear}` : ""}
              </div>
            </div>
            {r.existingTitleId ? (
              <Link
                href={`/admin/titles/${r.existingTitleId}`}
                className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
              >
                Already imported
              </Link>
            ) : (
              <button
                type="button"
                disabled={isImporting && importingId === r.anilistId}
                onClick={() => handleImport(r.anilistId)}
                className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
              >
                {isImporting && importingId === r.anilistId ? "Importing…" : "Import"}
              </button>
            )}
          </li>
        ))}
        {results.length === 0 && query.trim().length >= 2 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">No AniList matches.</li>
        )}
      </ul>
    </div>
  );
}
