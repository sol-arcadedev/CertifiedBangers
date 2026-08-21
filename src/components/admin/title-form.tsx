"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { searchTitles, type TitleActionState } from "@/lib/actions/titles";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";

const inputClass =
  "rounded-lg border border-border bg-panel px-3 py-2 text-base text-foreground";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-foreground";

export type TitleDefaults = {
  id?: string;
  name: string;
  synonyms: string[];
  type: string;
  status: string;
  author: string | null;
  illustrator: string | null;
  genres: string[];
  synopsis: string | null;
  publicationYear: number | null;
  externalLinks: string[];
  coverUrl: string | null;
};

type DuplicateResult = {
  id: string;
  name: string;
  type: string;
  publicationYear: number | null;
};

type AniListDuplicate = {
  anilistId: number;
  name: string;
  type: string;
  publicationYear: number | null;
};

export function TitleForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: TitleActionState, formData: FormData) => Promise<TitleActionState>;
  defaults?: TitleDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [name, setName] = useState(defaults?.name ?? "");
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [aniListDuplicates, setAniListDuplicates] = useState<AniListDuplicate[]>([]);
  const [, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (name.trim().length < 2) {
        setDuplicates([]);
        setAniListDuplicates([]);
        return;
      }
      startSearch(async () => {
        const results = await searchTitles(name);
        setDuplicates(results.local.filter((r) => r.id !== defaults?.id));
        setAniListDuplicates(results.aniList);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, defaults?.id]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={labelClass}>
        Name
        <input
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </label>

      {duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-sm text-amber-300">
          <p className="font-medium">Possible duplicates already in the catalog:</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/titles/${d.id}`} className="underline" target="_blank">
                  {d.name}
                </Link>{" "}
                ({d.type}
                {d.publicationYear ? `, ${d.publicationYear}` : ""})
              </li>
            ))}
          </ul>
        </div>
      )}

      {aniListDuplicates.length > 0 && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-sm text-amber-300">
          <p className="font-medium">
            Found on AniList — consider using{" "}
            <Link href="/admin/titles/import" className="underline" target="_blank">
              Import from AniList
            </Link>{" "}
            instead of a manual entry:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {aniListDuplicates.map((d) => (
              <li key={d.anilistId}>
                {d.name} ({d.type}
                {d.publicationYear ? `, ${d.publicationYear}` : ""})
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className={labelClass}>
        Synonyms / alternate names (comma-separated)
        <input
          name="synonyms"
          type="text"
          defaultValue={defaults?.synonyms.join(", ")}
          className={inputClass}
        />
      </label>

      <div className="flex gap-4">
        <label className={`${labelClass} flex-1`}>
          Type
          <select name="type" required defaultValue={defaults?.type ?? ""} className={inputClass}>
            <option value="" disabled>
              Select…
            </option>
            {Object.values(TitleType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className={`${labelClass} flex-1`}>
          Status
          <select
            name="status"
            required
            defaultValue={defaults?.status ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {Object.values(TitleStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-4">
        <label className={`${labelClass} flex-1`}>
          Author
          <input
            name="author"
            type="text"
            defaultValue={defaults?.author ?? ""}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} flex-1`}>
          Illustrator
          <input
            name="illustrator"
            type="text"
            defaultValue={defaults?.illustrator ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Genres (comma-separated)
        <input
          name="genres"
          type="text"
          defaultValue={defaults?.genres.join(", ")}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Publication year
        <input
          name="publicationYear"
          type="number"
          defaultValue={defaults?.publicationYear ?? ""}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Synopsis
        <textarea
          name="synopsis"
          rows={4}
          defaultValue={defaults?.synopsis ?? ""}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        External links (comma-separated)
        <input
          name="externalLinks"
          type="text"
          defaultValue={defaults?.externalLinks.join(", ")}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        {defaults?.coverUrl ? "Replace cover image" : "Cover image"}
        <input name="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </label>

      {defaults?.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={defaults.coverUrl}
          alt="Current cover"
          className="h-40 w-28 rounded object-cover"
        />
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="text-sm text-emerald-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-accent text-accent-foreground font-medium transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
