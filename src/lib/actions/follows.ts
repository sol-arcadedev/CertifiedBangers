"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// Click again to unfollow — same toggle shape as voteOnReview
// (src/lib/actions/votes.ts). Following yourself is blocked, same
// reasoning as voting on your own review (Section 5's anti-gaming stance).
export async function toggleFollow(targetUserId: string, targetUsername: string) {
  const user = await requireUser();
  if (user.id === targetUserId) return;

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { followerId: user.id, followingId: targetUserId } });
  }

  revalidatePath(`/profile/${targetUsername}`);
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/feed");
}
