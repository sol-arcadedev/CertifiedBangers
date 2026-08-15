import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const popularTitles = await prisma.title.findMany({
    orderBy: { anilistPopularity: { sort: "desc", nulls: "last" } },
    take: 8,
  });

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          CertifiedBanger
        </h1>
        <p className="mt-3 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Community-curated manga/manhwa reviews.
        </p>
      </div>

      {popularTitles.length > 0 && (
        <div className="mx-auto w-full max-w-4xl px-6 pb-16">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Popular titles
            </h2>
            <Link href="/titles" className="text-sm text-zinc-600 underline dark:text-zinc-400">
              Browse all
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {popularTitles.map((title) => (
              <Link key={title.id} href={`/titles/${title.id}`} className="group">
                {title.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={title.coverUrl}
                    alt={title.name}
                    className="aspect-[2/3] w-full rounded object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    No cover
                  </div>
                )}
                <div className="mt-2 text-sm font-medium text-black group-hover:underline dark:text-zinc-50">
                  {title.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {title.type}
                  {title.anilistAverageScore !== null && ` · ${title.anilistAverageScore}/100`}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
