"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";

interface ChatMsg {
  id: number;
  sender: { username: string; display_name: string };
  content: string;
  created_at: string;
}

export function GameChat({ gameId }: { gameId: string }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!user || !gameId) return;
    socialApi
      .chatHistory("game", gameId)
      .then(({ data }) => {
        setMessages(Array.isArray(data) ? data : data.results ?? []);
        setLoadError(null);
      })
      .catch((err) => {
        setMessages([]);
        setLoadError(formatApiError(err, t("chat.error.load")));
      });
  }, [user, gameId, t]);

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
    setSendError(null);
    try {
      await socialApi.sendChat("game", gameId, msg);
      setText("");
      load();
    } catch (err) {
      setSendError(formatApiError(err, t("chat.error.send")));
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <p className="text-xs opacity-60 p-3">{t("chat.loginRequired")}</p>
    );
  }

  return (
    <div className="glass-card flex flex-col h-[220px]">
      <h3 className="font-semibold text-sm p-3 border-b border-white/10">{t("chat.title")}</h3>
      {loadError && (
        <InlineAlert className="m-2 text-xs" onDismiss={() => setLoadError(null)}>
          {loadError}
        </InlineAlert>
      )}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {messages.length === 0 && !loadError && (
          <p className="opacity-50 text-center py-4">{t("chat.empty")}</p>
        )}
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
      {sendError && (
        <p className="px-2 text-xs text-africhess-terracotta" role="alert">
          {sendError}
        </p>
      )}
      <div className="flex gap-1 p-2 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("chat.placeholder")}
          className="flex-1 text-sm px-2 py-1 rounded border bg-transparent"
          maxLength={500}
          aria-label={t("chat.placeholder")}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="px-3 py-1 text-sm rounded-lg african-gradient text-white disabled:opacity-50"
          aria-label={t("chat.send")}
        >
          →
        </button>
      </div>
    </div>
  );
}
