"use client";

import { parseSSE } from "@zetra/sdk";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Item = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };

const STORAGE_KEY = "zetra-template:conversation";
const newId = () => Math.random().toString(36).slice(2);

function readStored(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
function writeStored(id: string | undefined) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked */
  }
}

export function Chat({ welcome, suggestions = [] }: { welcome: string; suggestions?: string[] }) {
  const [items, setItems] = useState<Item[]>([{ id: "welcome", role: "assistant", text: welcome }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationId.current = readStored();
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [items]);

  const patch = (id: string, fn: (i: Item) => Item) => setItems((all) => all.map((i) => (i.id === id ? fn(i) : i)));

  async function stream(message: string, replyId: string, signal: AbortSignal) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId: conversationId.current }),
      signal,
    });
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
    }
    for await (const evt of parseSSE(res.body)) {
      const data = JSON.parse(evt.data);
      if (evt.event === "start" || evt.event === "done") {
        conversationId.current = data.conversationId;
        writeStored(data.conversationId);
      }
      if (evt.event === "delta") patch(replyId, (i) => ({ ...i, text: i.text + data.text }));
      if (evt.event === "error") throw Object.assign(new Error(data.message), { code: data.code as string });
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    const replyId = newId();
    setItems((all) => [...all, { id: newId(), role: "user", text: message }, { id: replyId, role: "assistant", text: "", streaming: true }]);

    abort.current = new AbortController();
    try {
      try {
        await stream(message, replyId, abort.current.signal);
      } catch (err) {
        // A stored conversation may have expired — start a fresh one and retry once.
        if ((err as { code?: string }).code !== "not_found" || !conversationId.current) throw err;
        conversationId.current = undefined;
        writeStored(undefined);
        await stream(message, replyId, abort.current.signal);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Something went wrong.");
        setItems((all) => all.filter((i) => !(i.id === replyId && !i.text)));
      }
    } finally {
      patch(replyId, (i) => ({ ...i, streaming: false }));
      setBusy(false);
      abort.current = null;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    send(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget.form as HTMLFormElement).requestSubmit();
    }
  }

  function reset() {
    abort.current?.abort();
    conversationId.current = undefined;
    writeStored(undefined);
    setItems([{ id: "welcome", role: "assistant", text: welcome }]);
    setError(null);
  }

  return (
    <section className="chat" aria-label="Chat with our assistant">
      <header className="chat-head">
        <span className="dot" aria-hidden /> Assistant
        <button type="button" className="ghost" onClick={reset}>
          New chat
        </button>
      </header>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`bubble ${i.role}${i.streaming ? " streaming" : ""}`}>
            {i.text}
          </div>
        ))}
        {items.length === 1 && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      <form className="chat-form" onSubmit={onSubmit}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything…"
          aria-label="Message"
          maxLength={4000}
        />
        {busy ? (
          <button type="button" onClick={() => abort.current?.abort()}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </section>
  );
}
