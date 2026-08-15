import Link from "next/link";

type TitleCard = {
  id: string;
  name: string;
  type: string;
  coverUrl: string | null;
  anilistAverageScore: number | null;
};

export function TitleCardGrid({ titles }: { titles: TitleCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {titles.map((title) => (
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
  );
}
