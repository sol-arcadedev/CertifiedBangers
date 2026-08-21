import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTitle } from "@/lib/actions/titles";
import { TitleForm } from "@/components/admin/title-form";
import { CoverOnlyForm } from "@/components/admin/cover-only-form";
import { DeleteTitleButton } from "@/components/admin/delete-title-button";
import { MergeTitleForm } from "@/components/admin/merge-title-form";

export default async function EditTitlePage(props: PageProps<"/admin/titles/[id]">) {
  const { id } = await props.params;

  const title = await prisma.title.findUnique({ where: { id } });
  if (!title) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">{title.name}</h1>

      {title.anilistId !== null ? (
        <CoverOnlyForm action={updateTitle.bind(null, id)} coverUrl={title.coverUrl} />
      ) : (
        <TitleForm
          action={updateTitle.bind(null, id)}
          defaults={{
            id: title.id,
            name: title.name,
            synonyms: title.synonyms,
            type: title.type,
            status: title.status,
            author: title.author,
            illustrator: title.illustrator,
            genres: title.genres,
            synopsis: title.synopsis,
            publicationYear: title.publicationYear,
            externalLinks: title.externalLinks,
            coverUrl: title.coverUrl,
          }}
          submitLabel="Save changes"
        />
      )}

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-base font-semibold text-foreground">
          Merge a duplicate into this title
        </h2>
        <p className="mt-1 text-sm text-muted">
          Search for the duplicate, then confirm — its reviews and library entries move here, and
          it gets deleted.
        </p>
        <div className="mt-3">
          <MergeTitleForm id={id} />
        </div>
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-base font-semibold text-foreground">Danger zone</h2>
        <div className="mt-3">
          <DeleteTitleButton id={id} />
        </div>
      </div>
    </div>
  );
}
