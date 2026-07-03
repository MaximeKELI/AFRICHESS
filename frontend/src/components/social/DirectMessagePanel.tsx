"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface UserPublic {
  id: number;
  username: string;
  display_name: string;
}

interface ChatMsg {
  id: number;
  sender: UserPublic;
  content: string;
  created_at: string;
}

interface DirectMessagePanelProps {
  username: string;
  displayName?: string;
  className?: string;
}

export function DirectMessagePanel({
  username,
  displayName,
  className = "",
}: DirectMessagePanelProps) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    socialApi
      .directMessages(username)
      .then(({ data }) => setMessages(Array.isArray(data) ? data : []))
      .catch((err) => {
        setMessages([]);
        setError(formatApiError(err, t("friends.error.messages")));
      })
      .finally(() => setLoading(false));
  }, [username, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await socialApi.sendDirectMessage(username, text.trim());
      setText("");
      load();
    } catch (err) {
      setError(formatApiError(err, t("friends.message.failed")));
    } finally {
      setSending(false);
    }
  };

  const label = displayName || username;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <Link
          href={`/profile/${username}`}
          className="font-semibold text-lg hover:text-africhess-gold truncate"
        >
          {label}
        </Link>
        <span className="text-xs opacity-50 shrink-0">@{username}</span>
      </div>

      {error && (
        <InlineAlert className="mb-3" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <div
        ref={scrollRef}
        className="flex-1 min-h-[280px] max-h-[min(60vh,520px)] overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-black/10 p-4 mb-4"
      >
        {loading ? (
          <p className="text-sm opacity-50">{t("common.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-8">{t("friends.messages.empty")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender.id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-africhess-gold/20 text-right" : "bg-white/10"
                  }`}
                >
                  {!mine && (
                    <span className="text-[10px] opacity-60 block mb-0.5">
                      {m.sender.display_name || m.sender.username}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={t("friends.messages.placeholder")}
          className="flex-1 border rounded-xl px-4 py-3 bg-transparent text-sm"
          disabled={sending}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="px-5 py-3 rounded-xl african-gradient text-white text-sm font-medium disabled:opacity-50"
        >
          {t("friends.messages.send")}
        </button>
      </div>
    </div>
  );
}
