"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, X, Send } from "lucide-react";
import { CARD } from "@/lib/ui-classes";

const FOCUS_RING_XS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

type Message = {
  role: "user" | "model";
  text: string;
  recommendedTitles?: { id: string; name: string; coverUrl: string | null }[];
};

const GREETING: Message = {
  role: "model",
  text: "Hey! I'm the CertifiedBanger Buddy. Ask me for a manga/manhwa recommendation, or just say hi.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: "model",
          text: data.reply ?? "Something went wrong — try again?",
          recommendedTitles: data.recommendedTitles,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "model", text: "Sorry, I couldn't reach the server — try again in a bit." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className={`flex h-[28rem] w-80 flex-col overflow-hidden ${CARD} shadow-2xl shadow-black/40`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-display text-sm font-bold text-foreground">CertifiedBanger Buddy</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className={`rounded-full p-1 text-muted hover:text-foreground ${FOCUS_RING_XS}`}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-foreground"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm bg-panel-hover px-3 py-2 text-sm text-foreground"
                  }
                >
                  <p className="whitespace-pre-wrap leading-5">{m.text}</p>
                  {m.recommendedTitles && m.recommendedTitles.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {m.recommendedTitles.map((t) => (
                        <Link
                          key={t.id}
                          href={`/titles/${t.id}`}
                          className={`flex items-center gap-2 rounded-lg border border-border-strong bg-background/60 p-1.5 hover:border-accent/40 ${FOCUS_RING_XS}`}
                        >
                          {t.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.coverUrl} alt="" className="h-10 w-7 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-7 shrink-0 rounded bg-panel-hover" />
                          )}
                          <span className="line-clamp-2 text-xs font-medium text-foreground">{t.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-panel-hover px-3 py-2 text-sm text-muted">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for a recommendation…"
              className="flex-1 rounded-full border border-border bg-panel px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {/* Compact icon-only pill — not composed from BUTTON_PRIMARY,
                which bakes in px-5 py-2 that conflicts with this fixed
                8x8 shape (same reasoning as report-button.tsx's submit
                button). */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-accent-hover to-accent text-accent-foreground transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none ${FOCUS_RING_XS}`}
            >
              <Send aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-accent-hover to-accent text-accent-foreground shadow-[0_4px_14px_-4px_rgba(226,163,61,0.5)] transition-all hover:brightness-110 ${FOCUS_RING_XS}`}
      >
        {open ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
