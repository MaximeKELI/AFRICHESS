"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface ChatMsg {
  id: number;
  sender: { username: string; display_name: string };
  content: string;
  created_at: string;
}

export function GameChat({ gameId }: { gameId: string }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!user || !gameId) return;
    socialApi
      .chatHistory("game", gameId)
      .then(({ data }) => setMessages(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => {});
  }, [user, gameId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      await socialApi.sendChat("game", gameId, msg);
      setText("");
      load();
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <p className="text-xs opacity-60 p-3">Connectez-vous pour chatter en partie.</p>
    );
  }

  return (
    <div className="glass-card flex flex-col h-[220px]">
      <h3 className="font-semibold text-sm p-3 border-b border-white/10">Chat</h3>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {messages.map((m) => (
          <div key={m.id}>
            <span className="font-medium text-africhess-gold">
              {m.sender.display_name || m.sender.username}:
            </span>{" "}
            <span>{m.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1 p-2 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 text-sm px-2 py-1 rounded border bg-transparent"
          maxLength={500}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="px-3 py-1 text-sm rounded-lg african-gradient text-white disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
