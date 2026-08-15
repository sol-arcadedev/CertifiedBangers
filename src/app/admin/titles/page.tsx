import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminTitlesPage(props: PageProps<"/admin/titles">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const titles = await prisma.title.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { altNames: { has: q } }] }
      : undefined,
    orderBy: { name: "asc" },
    take: 50,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Titles</h1>
        <Link
          href="/admin/titles/new"
          className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background"
        >
          New title
        </Link>
      </div>

      <form className="mt-4" action="/admin/titles">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-full rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50"
        />
      </form>

      <ul className="mt-6 divide-y divide-black/[.08] dark:divide-white/[.145]">
        {titles.map((title) => (
          <li key={title.id} className="flex items-center justify-between py-3">
            <div>
              <Link
                href={`/admin/titles/${title.id}`}
                className="font-medium text-black dark:text-zinc-50"
              >
                {title.name}
              </Link>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {title.type} · {title.status}
                {title.publicationYear ? ` · ${title.publicationYear}` : ""}
              </div>
            </div>
          </li>
        ))}
        {titles.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            {q ? `No titles matching "${q}".` : "No titles yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
