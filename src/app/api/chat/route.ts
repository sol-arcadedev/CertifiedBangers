import { getCurrentUser } from "@/lib/auth";
import { getDistinctGenres } from "@/lib/genres";
import { runChat, type ChatTurn } from "@/lib/chat/gemini";
import { recommendTitles, recommendTitlesDeclaration, type RecommendedTitle } from "@/lib/chat/recommend-titles";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 20;

function buildSystemInstruction(genres: string[]): string {
  return [
    "You are the CertifiedBanger Buddy, a friendly chatbot on CertifiedBanger — a community review site for manga, manhwa, and manhua.",
    "Keep the conversation simple and on-topic (this site and its titles). You can chat casually, but you're here to help people find something great to read.",
    `The site's known genres are: ${genres.join(", ")}. Only ask about or search for genres from this list.`,
    "If someone wants a recommendation, ask what genre or mood they're in the mood for if you don't already know it from the conversation, then call recommend_titles.",
    "Only ever mention titles that recommend_titles actually returned — never invent a title, review, or score. If it returns nothing, say so honestly and suggest trying a different genre.",
    "Keep replies short and conversational, not a wall of text.",
  ].join("\n");
}

function fallbackReply() {
  return Response.json({
    reply: "Sorry, I'm having trouble responding right now — please try again in a bit.",
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required." }, { status: 400 });
  }

  const history: ChatTurn[] = messages
    .filter(
      (m): m is ChatTurn =>
        typeof m === "object" &&
        m !== null &&
        (m as ChatTurn).role !== undefined &&
        ["user", "model"].includes((m as ChatTurn).role) &&
        typeof (m as ChatTurn).text === "string",
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ ...m, text: m.text.slice(0, MAX_MESSAGE_LENGTH) }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "messages must end with a user turn." }, { status: 400 });
  }

  // Resolved server-side from the authenticated session only — never trusted
  // from the request body — so recommendations can't be spoofed into
  // skipping a user's own library.
  const user = await getCurrentUser();
  const genres = await getDistinctGenres();

  let lastRecommendedTitles: RecommendedTitle[] | undefined;

  const tools = [
    {
      declaration: recommendTitlesDeclaration,
      execute: async (args: Record<string, unknown>) => {
        const requestedGenres = Array.isArray(args.genres)
          ? args.genres.filter((g): g is string => typeof g === "string")
          : [];
        const limit = typeof args.limit === "number" ? args.limit : undefined;
        const titles = await recommendTitles(requestedGenres, user?.id ?? null, limit);
        lastRecommendedTitles = titles;
        return { titles };
      },
    },
  ];

  try {
    const { text } = await runChat(history, buildSystemInstruction(genres), tools);
    return Response.json({
      reply: text || "I'm not sure how to respond to that — could you rephrase?",
      recommendedTitles: lastRecommendedTitles?.map((t) => ({
        id: t.id,
        name: t.name,
        coverUrl: t.coverUrl,
      })),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return fallbackReply();
  }
}
