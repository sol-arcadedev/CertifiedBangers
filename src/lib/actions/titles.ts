"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { uploadCoverBuffer, deleteCoverIfOwned } from "@/lib/cover-storage";
import { recomputeTitleAggregates } from "@/lib/title-aggregates";
import { searchAniListMedia } from "@/lib/anilist";
import { TitleType, TitleStatus } from "@/generated/prisma/enums";

export type TitleActionState = { error?: string; message?: string } | undefined;

function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTitleFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!name) return { error: "Name is required." } as const;
  if (!Object.values(TitleType).includes(type as TitleType)) {
    return { error: "Invalid type." } as const;
  }
  if (!Object.values(TitleStatus).includes(status as TitleStatus)) {
    return { error: "Invalid status." } as const;
  }

  const publicationYearRaw = String(formData.get("publicationYear") ?? "").trim();

  return {
    data: {
      name,
      type: type as TitleType,
      status: status as TitleStatus,
      synonyms: parseList(formData.get("synonyms")),
      genres: parseList(formData.get("genres")),
      externalLinks: parseList(formData.get("externalLinks")),
      author: String(formData.get("author") ?? "").trim() || null,
      illustrator: String(formData.get("illustrator") ?? "").trim() || null,
      synopsis: String(formData.get("synopsis") ?? "").trim() || null,
      publicationYear: publicationYearRaw ? Number(publicationYearRaw) : null,
    },
  } as const;
}

async function uploadCover(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadCoverBuffer(buffer, file.type || "image/jpeg", ext);
}

// Called directly (via startTransition) from the new/edit title forms as
// the admin types a name — "search-before-create" de-dup UX (README
// Section 4.1) — not bound to a <form>, so it isn't (prevState, formData).
// Also checks AniList directly (Entry 52): title/titleRomaji/etc. are only
// ever populated locally for manual titles now, so a name match against an
// AniList-linked title already in our catalog still works (its cached
// `name` fallback is searched too), but a duplicate that isn't in our
// catalog *yet* would otherwise go undetected without this.
export async function searchTitles(query: string) {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return { local: [], aniList: [] };

  const [local, aniList] = await Promise.all([
    prisma.title.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { titleRomaji: { contains: q, mode: "insensitive" } },
          { titleEnglish: { contains: q, mode: "insensitive" } },
          { titleNative: { contains: q, mode: "insensitive" } },
          { synonyms: { has: q } },
        ],
      },
      select: { id: true, name: true, type: true, publicationYear: true },
      take: 8,
      orderBy: { name: "asc" },
    }),
    searchAniListMedia(q).catch(() => []),
  ]);

  return { local, aniList: aniList.slice(0, 5) };
}

export async function createTitle(
  _prevState: TitleActionState,
  formData: FormData,
): Promise<TitleActionState> {
  await requireAdmin();

  const parsed = parseTitleFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  let coverUrl: string | null = null;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    try {
      coverUrl = await uploadCover(cover);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Cover upload failed." };
    }
  }

  const title = await prisma.title.create({ data: { ...parsed.data, coverUrl } });

  revalidatePath("/admin/titles");
  redirect(`/admin/titles/${title.id}`);
}

export async function updateTitle(
  id: string,
  _prevState: TitleActionState,
  formData: FormData,
): Promise<TitleActionState> {
  await requireAdmin();

  const existing = await prisma.title.findUnique({ where: { id } });
  if (!existing) return { error: "Title not found." };

  // AniList-linked titles no longer store editable metadata locally
  // (Entry 52) — name/genres/synopsis/etc. are always fetched live, so
  // there's nothing meaningful for this form to write back except the
  // cover. Manual titles (existing.anilistId === null) are unaffected.
  if (existing.anilistId !== null) {
    return updateTitleCover(id, existing.coverUrl, formData);
  }

  const parsed = parseTitleFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  let coverUrl = existing.coverUrl;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    try {
      const newCoverUrl = await uploadCover(cover);
      await deleteCoverIfOwned(existing.coverUrl);
      coverUrl = newCoverUrl;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Cover upload failed." };
    }
  }

  await prisma.title.update({ where: { id }, data: { ...parsed.data, coverUrl } });

  revalidatePath("/admin/titles");
  revalidatePath(`/admin/titles/${id}`);
  return { message: "Saved." };
}

async function updateTitleCover(
  id: string,
  existingCoverUrl: string | null,
  formData: FormData,
): Promise<TitleActionState> {
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    try {
      const newCoverUrl = await uploadCover(cover);
      await deleteCoverIfOwned(existingCoverUrl);
      await prisma.title.update({ where: { id }, data: { coverUrl: newCoverUrl } });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Cover upload failed." };
    }
  }

  revalidatePath("/admin/titles");
  revalidatePath(`/admin/titles/${id}`);
  return { message: "Saved." };
}

export async function deleteTitle(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: TitleActionState,
): Promise<TitleActionState> {
  await requireAdmin();

  const existing = await prisma.title.findUnique({ where: { id } });
  if (!existing) return { error: "Title not found." };

  try {
    await prisma.title.delete({ where: { id } });
  } catch {
    return {
      error:
        "Can't delete — this title still has reviews or library entries. Merge it into another title instead.",
    };
  }

  await deleteCoverIfOwned(existing.coverUrl);

  revalidatePath("/admin/titles");
  redirect("/admin/titles");
}

// Reassigns the source title's reviews/library entries onto the target,
// skipping (and discarding) any that would collide with the target's
// existing one-per-user rows, then deletes the source. README Section 4.1:
// "admin merge tooling" for duplicates that slip past search-before-create.
// Both ids travel as form fields (not a bound positional arg) since the
// caller — the edit page for the *surviving* title — only knows the
// duplicate's id after the admin picks it from a live search.
export async function mergeTitles(
  _prevState: TitleActionState,
  formData: FormData,
): Promise<TitleActionState> {
  await requireAdmin();

  const sourceId = String(formData.get("sourceId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if (!sourceId) return { error: "Pick the duplicate title to merge in." };
  if (targetId === sourceId) return { error: "Can't merge a title into itself." };

  const [source, target] = await Promise.all([
    prisma.title.findUnique({ where: { id: sourceId } }),
    prisma.title.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) return { error: "Title not found." };

  await prisma.$transaction(async (tx) => {
    const reviews = await tx.review.findMany({ where: { titleId: sourceId } });
    for (const review of reviews) {
      const conflict = await tx.review.findUnique({
        where: { userId_titleId: { userId: review.userId, titleId: targetId } },
      });
      if (conflict) {
        await tx.review.delete({ where: { id: review.id } });
      } else {
        await tx.review.update({ where: { id: review.id }, data: { titleId: targetId } });
      }
    }

    const libraryEntries = await tx.libraryEntry.findMany({ where: { titleId: sourceId } });
    for (const entry of libraryEntries) {
      const conflict = await tx.libraryEntry.findUnique({
        where: { userId_titleId: { userId: entry.userId, titleId: targetId } },
      });
      if (conflict) {
        await tx.libraryEntry.delete({ where: { id: entry.id } });
      } else {
        await tx.libraryEntry.update({ where: { id: entry.id }, data: { titleId: targetId } });
      }
    }

    await tx.title.delete({ where: { id: sourceId } });

    // Recount + recompute avgCategoryScores now that the surviving title
    // owns whichever reviews moved over — the old code only recounted
    // reviewCount (and didn't filter to PUBLISHED), leaving
    // avgCategoryScores stale after every merge.
    await recomputeTitleAggregates(targetId, tx);
  });

  await deleteCoverIfOwned(source.coverUrl);

  revalidatePath("/admin/titles");
  redirect(`/admin/titles/${targetId}`);
}
