"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { socialApi } from "@/lib/api";
import { GAME_CHAT_PHRASES, phraseLabel } from "@/lib/chessChatPhrases";
import { isEmoteOnlyMessage } from "@/lib/chessEmotes";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { EmotePicker } from "@/components/social/EmotePicker";
import { UserFlair } from "@/components/profile/UserFlair";
import type { WsChatPayload } from "@/hooks/useGameWebSocket";

const WS_CHAT_CONFIRM_MS = 3500;

export interface GameChatMessage {
  id: number | string;
  sender: { username: string; display_name: string; flair?: string };
  content: string;
  created_at: string;
  pending?: boolean;
}

interface GameChatProps {
  gameId: string;
  opponentName?: string;
  wsConnected?: boolean;
  sendChat?: (message: string) => boolean;
  subscribeChat?: (listener: (msg: WsChatPayload) => void) => () => void;
  subscribeChatError?: (listener: (message: string) => void) => () => void;
  compact?: boolean;
}

function mapApiMessage(m: {
  id: number;
  sender: { username: string; display_name?: string; flair?: string };
  content: string;
  created_at: string;
}): GameChatMessage {
  return {
    id: m.id,
    sender: {
      username: m.sender.username,
      display_name: m.sender.display_name || m.sender.username,
      flair: m.sender.flair,
    },
    content: m.content,
    created_at: m.created_at,
  };
}

function mapWsPayload(msg: WsChatPayload): GameChatMessage {
  const sender = msg.sender ?? { username: msg.user ?? "?", display_name: msg.user ?? "?" };
  return {
    id: msg.id ?? `ws-${Date.now()}-${Math.random()}`,
    sender: {
      username: sender.username,
      display_name: sender.display_name || sender.username,
      flair: sender.flair,
    },
    content: msg.content ?? msg.message ?? "",
    created_at: msg.created_at ?? new Date().toISOString(),
  };
}

export function GameChat({
  gameId,
  opponentName,
  wsConnected = false,
  sendChat,
  subscribeChat,
  subscribeChatError,
  compact = false,
}: GameChatProps) {
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<GameChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(compact);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const wasConnectedRef = useRef(false);

  const clearPendingTimer = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  const removePending = useCallback((pendingId?: string | null) => {
    const id = pendingId ?? pendingIdRef.current;
    if (!id) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (pendingIdRef.current === id) pendingIdRef.current = null;
  }, []);

  const confirmPending = useCallback((mapped: GameChatMessage) => {
    clearPendingTimer();
    setMessages((prev) => {
      const withoutPending = prev.filter(
        (m) =>
          !(
            m.pending &&
            m.content === mapped.content &&
            m.sender.username === mapped.sender.username
          )
      );
      if (withoutPending.some((m) => m.id === mapped.id)) return withoutPending;
      return [...withoutPending, mapped];
    });
    pendingIdRef.current = null;
  }, [clearPendingTimer]);

  const appendMessage = useCallback((msg: GameChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const sendViaHttp = useCallback(
    async (msg: string, optimisticId: string) => {
      try {
        const { data } = await socialApi.sendChat("game", gameId, msg);
        clearPendingTimer();
        pendingIdRef.current = null;
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticId).concat(mapApiMessage(data))
        );
        setSendError(null);
      } catch (err) {
        removePending(optimisticId);
        setSendError(formatApiError(err, t("chat.error.send")));
        setText(msg);
      } finally {
        setSending(false);
      }
    },
    [gameId, t, clearPendingTimer, removePending]
  );

  const load = useCallback(() => {
    if (!user || !gameId) return;
    socialApi
      .chatHistory("game", gameId)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        setMessages(list.map(mapApiMessage));
        setLoadError(null);
      })
      .catch((err) => {
        setMessages([]);
        setLoadError(formatApiError(err, t("chat.error.load")));
      });
  }, [user, gameId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Recharger l'historique après reconnexion WS (messages HTTP manqués)
  useEffect(() => {
    if (wsConnected && !wasConnectedRef.current) {
      load();
    }
    wasConnectedRef.current = wsConnected;
  }, [wsConnected, load]);

  useEffect(() => {
    if (!subscribeChat) return;
    return subscribeChat((payload) => {
      const mapped = mapWsPayload(payload);
      if (!mapped.content) return;
      if (mapped.sender.username === user?.username) {
        confirmPending(mapped);
      } else {
        appendMessage(mapped);
        if (collapsed) setUnread((n) => n + 1);
      }
    });
  }, [subscribeChat, user?.username, appendMessage, collapsed, confirmPending]);

  useEffect(() => {
    if (!subscribeChatError) return;
    return subscribeChatError((message) => {
      clearPendingTimer();
      const pendingId = pendingIdRef.current;
      if (pendingId) {
        const pending = messages.find((m) => m.id === pendingId);
        removePending(pendingId);
        if (pending?.content) setText(pending.content);
      }
      setSendError(message);
      setSending(false);
    });
  }, [subscribeChatError, clearPendingTimer, removePending, messages]);

  useEffect(() => {
    if (!collapsed) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, collapsed]);

  useEffect(() => () => clearPendingTimer(), [clearPendingTimer]);

  const deliver = async (content: string) => {
    const msg = content.trim();
    if (!msg || sending || !user) return;
    setSending(true);
    setSendError(null);
    clearPendingTimer();

    const optimisticId = `pending-${Date.now()}`;
    const optimistic: GameChatMessage = {
      id: optimisticId,
      sender: {
        username: user.username,
        display_name: user.display_name || user.username,
        flair: user.flair ?? undefined,
      },
      content: msg,
      created_at: new Date().toISOString(),
      pending: true,
    };
    pendingIdRef.current = optimisticId;
    appendMessage(optimistic);
    setText("");

    const sentViaWs = wsConnected && sendChat?.(msg);
    if (sentViaWs) {
      // Si l'écho WS n'arrive pas, bascule HTTP (avec broadcast serveur)
      pendingTimerRef.current = setTimeout(() => {
        if (pendingIdRef.current !== optimisticId) return;
        void sendViaHttp(msg, optimisticId);
      }, WS_CHAT_CONFIRM_MS);
      setSending(false);
      return;
    }

    await sendViaHttp(msg, optimisticId);
  };

  if (!user) {
    return <p className="text-xs opacity-60 p-3">{t("chat.loginRequired")}</p>;
  }

  const heightClass = compact ? "h-[200px]" : "h-[min(280px,40vh)]";

  return (
    <div ref={panelRef} className="glass-card flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between gap-2 p-3 border-b border-white/10 text-left w-full hover:bg-white/5 transition"
        aria-expanded={!collapsed}
      >
        <span className="font-semibold text-sm inline-flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-africhess-gold" aria-hidden />
          {t("chat.title")}
          {opponentName ? (
            <span className="font-normal opacity-60 text-xs">· {opponentName}</span>
          ) : null}
        </span>
        <span className="flex items-center gap-2 text-xs opacity-60">
          {wsConnected ? (
            <span className="text-emerald-400">{t("chat.live")}</span>
          ) : (
            <span>{t("chat.rest")}</span>
          )}
          {unread > 0 && collapsed && (
            <span className="bg-africhess-gold text-black rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center">
              {unread}
            </span>
          )}
          <span aria-hidden>{collapsed ? "▾" : "▴"}</span>
        </span>
      </button>

      {!collapsed && (
        <>
          {loadError && (
            <InlineAlert className="m-2 text-xs" onDismiss={() => setLoadError(null)}>
              {loadError}
            </InlineAlert>
          )}
          <div className={`flex-1 overflow-y-auto p-2 space-y-2 text-xs ${heightClass}`}>
            {messages.length === 0 && !loadError && (
              <p className="opacity-50 text-center py-4">{t("chat.empty")}</p>
            )}
            {messages.map((m) => {
              const isMe = m.sender.username === user.username;
              return (
                <div
                  key={m.id}
                  className={`rounded-lg px-2 py-1.5 max-w-[95%] ${
                    isMe ? "ml-auto bg-africhess-green/20 text-right" : "mr-auto bg-white/5"
                  } ${m.pending ? "opacity-60" : ""}`}
                >
                  <div
                    className={`font-medium text-africhess-gold inline-flex items-center gap-0.5 ${
                      isMe ? "justify-end" : ""
                    }`}
                  >
                    <UserFlair flair={m.sender.flair} />
                    <span>{isMe ? t("chat.you") : m.sender.display_name || m.sender.username}</span>
                  </div>
                  <div
                    className={
                      isEmoteOnlyMessage(m.content) ? "text-2xl mt-0.5" : "mt-0.5 break-words"
                    }
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {sendError && (
            <p className="px-2 text-xs text-africhess-terracotta" role="alert">
              {sendError}
            </p>
          )}
          <div className="flex flex-wrap gap-1 px-2 pt-2 border-t border-white/10">
            {GAME_CHAT_PHRASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => deliver(phraseLabel(p, locale))}
                disabled={sending}
                className="text-[10px] px-2 py-1 rounded-full border border-white/15 hover:border-africhess-gold/50 hover:text-africhess-gold transition disabled:opacity-40"
              >
                {phraseLabel(p, locale)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-2 border-t border-white/10">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && deliver(text)}
              placeholder={t("chat.placeholder")}
              className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-white/15 bg-transparent focus:border-africhess-gold/50 outline-none"
              maxLength={500}
              aria-label={t("chat.placeholder")}
            />
            <button
              type="button"
              onClick={() => deliver(text)}
              disabled={sending || !text.trim()}
              className="px-3 py-1.5 text-sm rounded-lg african-gradient text-white disabled:opacity-50 shrink-0"
              aria-label={t("chat.send")}
            >
              →
            </button>
          </div>
          <EmotePicker onSelect={(emoji) => deliver(emoji)} disabled={sending} />
        </>
      )}
    </div>
  );
}
