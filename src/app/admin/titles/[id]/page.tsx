import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTitle } from "@/lib/actions/titles";
import { stripHtml } from "@/lib/strip-html";
import { TitleForm } from "@/components/admin/title-form";
import { DeleteTitleButton } from "@/components/admin/delete-title-button";
import { MergeTitleForm } from "@/components/admin/merge-title-form";

export default async function EditTitlePage(props: PageProps<"/admin/titles/[id]">) {
  const { id } = await props.params;

  const title = await prisma.title.findUnique({ where: { id } });
  if (!title) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 font-display text-xl font-bold text-foreground">{title.name}</h1>

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
          // Defensive, same as the public title page — a row mirrored
          // before Entry 76 fixed ingestion can still carry raw AniList
          // formatting tags until its next daily refresh.
          synopsis: title.synopsis ? stripHtml(title.synopsis) : null,
          publicationYear: title.publicationYear,
          externalLinks: title.externalLinks,
          coverUrl: title.coverUrl,
        }}
        submitLabel="Save changes"
      />

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
