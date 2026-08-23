"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollow } from "@/lib/actions/follows";
import { BUTTON_SECONDARY, BUTTON_PRIMARY } from "@/lib/ui-classes";

export function FollowButton({
  targetUserId,
  targetUsername,
  initiallyFollowing,
}: {
  targetUserId: string;
  targetUsername: string;
  initiallyFollowing: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [isFollowing, setOptimisticFollowing] = useOptimistic(initiallyFollowing);

  function handleClick() {
    startTransition(async () => {
      setOptimisticFollowing(!isFollowing);
      await toggleFollow(targetUserId, targetUsername);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={isFollowing ? BUTTON_SECONDARY : BUTTON_PRIMARY}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
