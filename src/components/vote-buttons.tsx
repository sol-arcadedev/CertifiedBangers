"use client";

import { useOptimistic, useTransition } from "react";
import { voteOnReview } from "@/lib/actions/votes";

type VoteValue = "UP" | "DOWN";

export function VoteButtons({
  reviewId,
  titleId,
  upvoteCount,
  downvoteCount,
  userVote,
  canVote,
}: {
  reviewId: string;
  titleId: string;
  upvoteCount: number;
  downvoteCount: number;
  userVote: VoteValue | null;
  canVote: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { upvoteCount, downvoteCount, userVote },
    (state, next: VoteValue) => {
      if (state.userVote === next) {
        return {
          upvoteCount: state.upvoteCount - (next === "UP" ? 1 : 0),
          downvoteCount: state.downvoteCount - (next === "DOWN" ? 1 : 0),
          userVote: null,
        };
      }
      return {
        upvoteCount:
          state.upvoteCount + (next === "UP" ? 1 : 0) - (state.userVote === "UP" ? 1 : 0),
        downvoteCount:
          state.downvoteCount + (next === "DOWN" ? 1 : 0) - (state.userVote === "DOWN" ? 1 : 0),
        userVote: next,
      };
    },
  );

  function vote(value: VoteValue) {
    startTransition(async () => {
      setOptimistic(value);
      await voteOnReview(reviewId, titleId, value);
    });
  }

  const netScore = optimistic.upvoteCount - optimistic.downvoteCount;

  if (!canVote) {
    return <span className="text-sm text-zinc-500 dark:text-zinc-400">{netScore >= 0 ? `+${netScore}` : netScore}</span>;
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={() => vote("UP")}
        aria-label="Upvote"
        className={
          optimistic.userVote === "UP"
            ? "text-green-600 dark:text-green-400"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        }
      >
        ▲
      </button>
      <span className="text-zinc-600 dark:text-zinc-400">{netScore >= 0 ? `+${netScore}` : netScore}</span>
      <button
        type="button"
        onClick={() => vote("DOWN")}
        aria-label="Downvote"
        className={
          optimistic.userVote === "DOWN"
            ? "text-red-600 dark:text-red-400"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        }
      >
        ▼
      </button>
    </div>
  );
}
