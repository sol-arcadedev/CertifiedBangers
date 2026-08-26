"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { LibraryStatus } from "@/generated/prisma/enums";
import { performAniListImport } from "@/lib/actions/anilist-import";
import { recomputeTitleLibraryCount } from "@/lib/title-aggregates";

// Fully independent of reviews (Entry 19) — a user can add any title to
// their library at any status, whether or not they've reviewed it. Upsert
// on the userId+titleId unique constraint: changing status is edit-replace,
// not a new row (mirrors how reviews work).
export async function setLibraryStatus(titleId: string, status: LibraryStatus) {
  const user = await requireUser();

  await prisma.libraryEntry.upsert({
    where: { userId_titleId: { userId: user.id, titleId } },
    update: { status },
    create: { userId: user.id, titleId, status },
  });
  await recomputeTitleLibraryCount(titleId);

  revalidatePath(`/titles/${titleId}`);
  revalidatePath(`/profile/${user.username}`);
}

export async function removeFromLibrary(titleId: string) {
  const user = await requireUser();

  await prisma.libraryEntry.deleteMany({ where: { userId: user.id, titleId } });
  await recomputeTitleLibraryCount(titleId);

  revalidatePath(`/titles/${titleId}`);
  revalidatePath(`/profile/${user.username}`);
}

// Entry point for the AniList preview page — adding an un-imported title
// to your library imports it first (no admin gate; same reasoning as
// submitReviewForAniListTitle). Redirects to the real page since the
// preview page's own layout has nothing to show once it's a real title.
export async function setLibraryStatusForAniListTitle(anilistId: number, status: LibraryStatus) {
  const user = await requireUser();

  const imported = await performAniListImport(anilistId);
  if ("error" in imported) return;

  await prisma.libraryEntry.upsert({
    where: { userId_titleId: { userId: user.id, titleId: imported.titleId } },
    update: { status },
    create: { userId: user.id, titleId: imported.titleId, status },
  });
  await recomputeTitleLibraryCount(imported.titleId);

  revalidatePath(`/profile/${user.username}`);
  redirect(`/titles/${imported.titleId}`);
}
