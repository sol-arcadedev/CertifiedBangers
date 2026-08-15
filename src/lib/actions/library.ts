"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { LibraryStatus } from "@/generated/prisma/enums";

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

  revalidatePath(`/titles/${titleId}`);
  revalidatePath(`/profile/${user.username}`);
}

export async function removeFromLibrary(titleId: string) {
  const user = await requireUser();

  await prisma.libraryEntry.deleteMany({ where: { userId: user.id, titleId } });

  revalidatePath(`/titles/${titleId}`);
  revalidatePath(`/profile/${user.username}`);
}
