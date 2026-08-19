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
    return <span className="text-sm text-muted">{netScore >= 0 ? `+${netScore}` : netScore}</span>;
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={() => vote("UP")}
        aria-label="Upvote"
        className={`-m-1.5 p-1.5 ${
          optimistic.userVote === "UP" ? "text-emerald-400" : "text-muted hover:text-foreground"
        }`}
      >
        ▲
      </button>
      <span className="text-muted">{netScore >= 0 ? `+${netScore}` : netScore}</span>
      <button
        type="button"
        onClick={() => vote("DOWN")}
        aria-label="Downvote"
        className={`-m-1.5 p-1.5 ${
          optimistic.userVote === "DOWN" ? "text-red-400" : "text-muted hover:text-foreground"
        }`}
      >
        ▼
      </button>
    </div>
  );
}
