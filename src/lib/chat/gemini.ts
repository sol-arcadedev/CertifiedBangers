import "server-only";
import {
  GoogleGenAI,
  createModelContent,
  createUserContent,
  createPartFromFunctionResponse,
  type Content,
  type FunctionDeclaration,
} from "@google/genai";

const MODEL = "gemini-3.6-flash";
// Caps how many times the model can call a tool before we force a final
// answer — a runaway loop would otherwise burn API quota on every message.
const MAX_TOOL_ROUNDS = 3;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ChatTurn = { role: "user" | "model"; text: string };

export type ChatTool = {
  declaration: FunctionDeclaration;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

export type ChatResult = { text: string; lastToolResult: unknown };

// Manual function-calling loop (Gemini's tool-call convention: the model's
// call comes back as a "model" content, the executed result is echoed back
// as a "user" content containing a functionResponse part — there's no
// separate "function" role in the public API). Only the whitelisted tools
// passed in can ever run — the model can't reach the database any other way.
export async function runChat(
  history: ChatTurn[],
  systemInstruction: string,
  tools: ChatTool[],
): Promise<ChatResult> {
  const contents: Content[] = history.map((turn) =>
    turn.role === "user" ? createUserContent(turn.text) : createModelContent(turn.text),
  );

  let lastToolResult: unknown = undefined;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? [{ functionDeclarations: tools.map((t) => t.declaration) }] : undefined,
      },
    });

    const modelParts = response.candidates?.[0]?.content?.parts ?? [];
    const calls = modelParts.filter((p) => p.functionCall).map((p) => p.functionCall!);
    if (calls.length === 0 || round === MAX_TOOL_ROUNDS) {
      return { text: response.text ?? "", lastToolResult };
    }

    // Echo back the model's own response parts verbatim (not reconstructed
    // from just name/args) — Gemini 3's function-call parts carry a
    // thoughtSignature the API requires to be round-tripped exactly, or the
    // next turn is rejected with 400 INVALID_ARGUMENT.
    contents.push({ role: "model", parts: modelParts });

    const responseParts = [];
    for (const call of calls) {
      const tool = tools.find((t) => t.declaration.name === call.name);
      const result = tool ? await tool.execute(call.args ?? {}) : { error: `Unknown tool: ${call.name}` };
      if (tool) lastToolResult = result;
      responseParts.push(
        createPartFromFunctionResponse(
          call.id ?? call.name ?? "",
          call.name ?? "",
          result as Record<string, unknown>,
        ),
      );
    }
    contents.push(createUserContent(responseParts));
  }

  return { text: "", lastToolResult };
}
