"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowBigUp, ArrowBigDown } from "lucide-react";
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
        aria-pressed={optimistic.userVote === "UP"}
        className={`-m-1.5 rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          optimistic.userVote === "UP" ? "text-success" : "text-muted hover:text-foreground"
        }`}
      >
        <ArrowBigUp className="h-4 w-4" fill={optimistic.userVote === "UP" ? "currentColor" : "none"} />
      </button>
      <span className="text-muted">{netScore >= 0 ? `+${netScore}` : netScore}</span>
      <button
        type="button"
        onClick={() => vote("DOWN")}
        aria-label="Downvote"
        aria-pressed={optimistic.userVote === "DOWN"}
        className={`-m-1.5 rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          optimistic.userVote === "DOWN" ? "text-danger" : "text-muted hover:text-foreground"
        }`}
      >
        <ArrowBigDown
          className="h-4 w-4"
          fill={optimistic.userVote === "DOWN" ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
