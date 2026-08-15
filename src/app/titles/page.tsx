import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Bare listing — search/filter/sort is WP5.1's job, not this one.
export default async function TitlesPage() {
  const titles = await prisma.title.findMany({
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">Titles</h1>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {titles.map((title) => (
          <li key={title.id} className="py-3">
            <Link href={`/titles/${title.id}`} className="font-medium text-black dark:text-zinc-50">
              {title.name}
            </Link>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {title.type} · {title.status}
              {title.reviewCount > 0 ? ` · ${title.reviewCount} reviews` : ""}
            </div>
          </li>
        ))}
        {titles.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No titles in the catalog yet.
          </li>
        )}
      </ul>
    </div>
  );
}
