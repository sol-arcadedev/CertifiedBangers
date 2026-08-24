import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { INPUT, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/ui-classes";

export default async function AdminTitlesPage(props: PageProps<"/admin/titles">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const unreviewedOnly = searchParams.unreviewed === "1";

  const searchClause = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { titleRomaji: { contains: q, mode: "insensitive" as const } },
          { titleEnglish: { contains: q, mode: "insensitive" as const } },
          { titleNative: { contains: q, mode: "insensitive" as const } },
          { synonyms: { has: q } },
        ],
      }
    : undefined;

  const [titles, totalCount, reviewedCount] = await Promise.all([
    prisma.title.findMany({
      where: unreviewedOnly ? { ...searchClause, reviewCount: 0 } : searchClause,
      // WP7.3: when hunting for launch-content gaps, most-visible titles
      // first — AniList popularity is the best proxy for which unreviewed
      // titles matter most to seed.
      orderBy: unreviewedOnly
        ? [{ anilistPopularity: { sort: "desc", nulls: "last" } }, { name: "asc" }]
        : { name: "asc" },
      take: 50,
    }),
    prisma.title.count(),
    prisma.title.count({ where: { reviewCount: { gt: 0 } } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Titles</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/titles/new" className="text-sm text-muted hover:text-foreground">
            Add manually
          </Link>
          <Link href="/admin/titles/import" className={`text-sm ${BUTTON_PRIMARY}`}>
            Import from AniList
          </Link>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted">
        {reviewedCount} of {totalCount} titles have at least one review.
      </p>

      <form className="mt-4 flex flex-wrap items-center gap-3" action="/admin/titles">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name…"
          className={`min-w-[200px] flex-1 ${INPUT}`}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="unreviewed" value="1" defaultChecked={unreviewedOnly} />
          Unreviewed only
        </label>
        <button type="submit" className={`text-sm ${BUTTON_SECONDARY}`}>
          Apply
        </button>
      </form>

      <ul className="mt-6 divide-y divide-border">
        {titles.map((title) => (
          <li key={title.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <Link href={`/admin/titles/${title.id}`} className="font-medium text-foreground hover:text-accent">
                {title.name}
              </Link>
              <div className="text-sm text-muted">
                {title.type} · {title.status}
                {title.publicationYear ? ` · ${title.publicationYear}` : ""}
                {` · ${title.reviewCount} review${title.reviewCount === 1 ? "" : "s"}`}
              </div>
            </div>
            {title.reviewCount === 0 && (
              <Link href={`/titles/${title.id}#review`} className={`text-sm ${BUTTON_SECONDARY}`}>
                Write review
              </Link>
            )}
          </li>
        ))}
        {titles.length === 0 && (
          <li className="py-6 text-sm text-muted">
            {q ? `No titles matching "${q}".` : unreviewedOnly ? "Every title has at least one review." : "No titles yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
