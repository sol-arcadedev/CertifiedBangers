import type { ChatTurn } from "@/lib/chat/gemini";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_TURNS = 20;

export type ParsedMessages = { ok: true; history: ChatTurn[] } | { ok: false; error: string };

function isChatTurnShaped(m: unknown): m is ChatTurn {
  return (
    typeof m === "object" &&
    m !== null &&
    ["user", "model"].includes((m as ChatTurn).role) &&
    typeof (m as ChatTurn).text === "string"
  );
}

// Pure — extracted from the /api/chat route handler (Entry 74) so the
// request-body validation (shape, truncation, turn-count cap, "must end
// with a user turn") is unit-testable without a request/Response object.
export function parseChatMessages(body: unknown): ParsedMessages {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages is required." };
  }

  const history: ChatTurn[] = messages
    .filter(isChatTurnShaped)
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ ...m, text: m.text.slice(0, MAX_MESSAGE_LENGTH) }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return { ok: false, error: "messages must end with a user turn." };
  }

  return { ok: true, history };
}
