import { describe, it, expect } from "vitest";
import { parseChatMessages, MAX_MESSAGE_LENGTH, MAX_HISTORY_TURNS } from "./parse-messages";

describe("parseChatMessages", () => {
  it("rejects a missing messages field", () => {
    const result = parseChatMessages({});
    expect(result).toEqual({ ok: false, error: "messages is required." });
  });

  it("rejects a non-array messages field", () => {
    const result = parseChatMessages({ messages: "hi" });
    expect(result).toEqual({ ok: false, error: "messages is required." });
  });

  it("rejects an empty messages array", () => {
    const result = parseChatMessages({ messages: [] });
    expect(result).toEqual({ ok: false, error: "messages is required." });
  });

  it("rejects null/non-object bodies without throwing", () => {
    expect(parseChatMessages(null)).toEqual({ ok: false, error: "messages is required." });
    expect(parseChatMessages("not an object")).toEqual({ ok: false, error: "messages is required." });
  });

  it("filters out malformed entries (missing role, bad role, non-string text)", () => {
    const result = parseChatMessages({
      messages: [
        { text: "no role" },
        { role: "system", text: "invalid role" },
        { role: "user", text: 123 },
        { role: "user", text: "the only valid one" },
      ],
    });
    expect(result).toEqual({ ok: true, history: [{ role: "user", text: "the only valid one" }] });
  });

  it("truncates message text longer than MAX_MESSAGE_LENGTH", () => {
    const longText = "a".repeat(MAX_MESSAGE_LENGTH + 500);
    const result = parseChatMessages({ messages: [{ role: "user", text: longText }] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.history[0].text).toHaveLength(MAX_MESSAGE_LENGTH);
    }
  });

  it("keeps only the last MAX_HISTORY_TURNS turns", () => {
    const turns = Array.from({ length: MAX_HISTORY_TURNS + 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "model",
      text: `turn ${i}`,
    }));
    // Force the final turn to be a user turn so this only tests the cap.
    turns[turns.length - 1] = { role: "user", text: "last" };

    const result = parseChatMessages({ messages: turns });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.history).toHaveLength(MAX_HISTORY_TURNS);
      expect(result.history[result.history.length - 1].text).toBe("last");
    }
  });

  it("rejects a conversation that doesn't end with a user turn", () => {
    const result = parseChatMessages({
      messages: [
        { role: "user", text: "hi" },
        { role: "model", text: "hello" },
      ],
    });
    expect(result).toEqual({ ok: false, error: "messages must end with a user turn." });
  });

  it("accepts a valid conversation ending in a user turn", () => {
    const result = parseChatMessages({
      messages: [
        { role: "user", text: "hi" },
        { role: "model", text: "hello" },
        { role: "user", text: "recommend something" },
      ],
    });
    expect(result).toEqual({
      ok: true,
      history: [
        { role: "user", text: "hi" },
        { role: "model", text: "hello" },
        { role: "user", text: "recommend something" },
      ],
    });
  });
});
