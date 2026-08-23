"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { useAssetManagerStore } from "@/stores/asset-manager";
import { cn } from "@/lib/utils";

/** Threaded chat with a local LLM (LM Studio / Ollama via the OpenAI SDK). */
export function ChatPanel({ worldId }: { worldId: string }) {
  const threads = useAssetManagerStore((s) => s.threads);
  const activeThreadId = useAssetManagerStore((s) => s.activeThreadId);
  const messages = useAssetManagerStore((s) => s.messages);
  const sending = useAssetManagerStore((s) => s.sending);
  const messagesLoading = useAssetManagerStore((s) => s.messagesLoading);
  const chatError = useAssetManagerStore((s) => s.chatError);
  const createThread = useAssetManagerStore((s) => s.createThread);
  const selectThread = useAssetManagerStore((s) => s.selectThread);
  const sendMessage = useAssetManagerStore((s) => s.sendMessage);
  const deleteThread = useAssetManagerStore((s) => s.deleteThread);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeThreadId || sending) return;
    setInput("");
    await sendMessage(worldId, activeThreadId, text);
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Threads sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Threads
          </span>
          <button
            onClick={() => createThread(worldId)}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/15"
          >
            <Plus className="size-3.5" /> New
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => selectThread(worldId, t.id)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                t.id === activeThreadId
                  ? "bg-[#0abab5]/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <MessageSquare className="size-3.5 shrink-0 text-white/40" />
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(worldId, t.id);
                }}
                title="Delete thread"
                aria-label="Delete thread"
                className="shrink-0 rounded p-0.5 text-white/30 opacity-0 transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <p className="px-2 py-3 text-xs text-white/40">
              No threads yet. Start a new chat.
            </p>
          )}
        </div>
      </aside>

      {/* Messages */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {messagesLoading && <p className="text-xs text-white/40">Loading…</p>}
          {chatError && <p className="mb-2 text-xs text-red-400">{chatError}</p>}

          {!activeThreadId && !messagesLoading && (
            <div className="flex h-full items-center justify-center text-xs text-white/30">
              Select or create a thread to start chatting.
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "mb-2 flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-[#0abab5]/20 text-white"
                    : "bg-white/8 text-white/90",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <p className="text-xs text-white/40">Assistant is thinking…</p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              activeThreadId ? "Message the assistant…" : "Create a thread first"
            }
            disabled={!activeThreadId || sending}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/25 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!activeThreadId || !input.trim() || sending}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0abab5] text-black transition-colors hover:bg-[#0cc9c3] disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
