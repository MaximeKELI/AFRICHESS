"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { wsAuthProtocols, wsGameUrl } from "@/lib/gameWs";
import { tr } from "@/lib/i18n/labels";

export interface WsGamePayload {
  game: {
    id: string;
    fen: string;
    status: string;
    result?: string;
    turn?: string;
    white_time_ms: number;
    black_time_ms: number;
    increment_ms?: number;
    moves?: Array<{
      san: string;
      uci: string;
      from_square?: string;
      to_square?: string;
      played_by_white: boolean;
    }>;
    white_player?: { id: number; username: string };
    black_player?: { id: number; username: string };
    is_vs_ai?: boolean;
    draw_offered_by?: number | null;
    takeback_requested_by?: number | null;
    is_rated?: boolean;
    termination_reason?: string;
    white_elo?: number | null;
    black_elo?: number | null;
    white_elo_provisional?: boolean;
    black_elo_provisional?: boolean;
    rating_changes?: {
      white?: {
        user_id: number;
        elo_before: number;
        elo_after: number;
        change: number;
      };
      black?: {
        user_id: number;
        elo_before: number;
        elo_after: number;
        change: number;
      };
    };
  };
  last_move?: {
    san: string;
    uci: string;
    from_square?: string;
    to_square?: string;
    played_by_white: boolean;
  };
  game_over?: boolean;
  reason?: string;
}

type WsHandler = (payload: WsGamePayload) => void;

export interface WsGamePatch {
  draw_offered_by?: number | null;
  takeback_requested_by?: number | null;
}

type WsPatchHandler = (patch: WsGamePatch) => void;

export interface WsChatPayload {
  id?: number;
  user?: string;
  message?: string;
  content?: string;
  created_at?: string;
  sender?: {
    username: string;
    display_name?: string;
    flair?: string;
  };
}

type ChatListener = (msg: WsChatPayload) => void;

const MAX_WS_RETRIES = 5;

export function useGameWebSocket(
  gameId: string | null,
  enabled: boolean,
  onUpdate: WsHandler,
  onGameOver?: WsHandler,
  onGamePatch?: WsPatchHandler
) {
  const [connected, setConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const onGameOverRef = useRef(onGameOver);
  const onGamePatchRef = useRef(onGamePatch);
  const chatListenersRef = useRef<Set<ChatListener>>(new Set());

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onGameOverRef.current = onGameOver;
    onGamePatchRef.current = onGamePatch;
  }, [onUpdate, onGameOver, onGamePatch]);

  useEffect(() => {
    if (!gameId || !enabled) {
      setConnected(false);
      setWsError(null);
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const liveToken = Cookies.get("access_token");
      if (!liveToken) {
        setWsError(tr("ws.error.session"));
        return;
      }
      const ws = new WebSocket(wsGameUrl(gameId), wsAuthProtocols(liveToken));
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        retryRef.current = 0;
        setWsError(null);
        setConnected(true);
        ws.send(JSON.stringify({ event: "rejoindre_partie" }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const { event, data } = msg;
          if (
            event === "game_state" ||
            event === "recevoir_coup" ||
            event === "partie_demarree" ||
            event === "rejoindre_partie"
          ) {
            if (data?.game) onUpdateRef.current(data as WsGamePayload);
          }
          if (event === "fin_partie" && data?.game) {
            onUpdateRef.current(data as WsGamePayload);
            onGameOverRef.current?.(data as WsGamePayload);
          }
          if (event === "chat" && data) {
            chatListenersRef.current.forEach((fn) => fn(data as WsChatPayload));
          }
          if (event === "proposition_nulle" && data) {
            if (data.declined) {
              onGamePatchRef.current?.({ draw_offered_by: null });
            } else if (data.offered_by != null) {
              onGamePatchRef.current?.({ draw_offered_by: data.offered_by as number });
            }
          }
          if (event === "proposition_reprise" && data) {
            if (data.declined) {
              onGamePatchRef.current?.({ takeback_requested_by: null });
            } else if (data.requested_by != null) {
              onGamePatchRef.current?.({ takeback_requested_by: data.requested_by as number });
            } else if (data.game) {
              onUpdateRef.current(data as WsGamePayload);
              const game = (data as WsGamePayload).game as Record<string, unknown>;
              onGamePatchRef.current?.({
                draw_offered_by: (game.draw_offered_by as number | null) ?? null,
                takeback_requested_by: (game.takeback_requested_by as number | null) ?? null,
              });
            }
          }
          if (event === "error") {
            const message =
              typeof data?.message === "string" ? data.message : tr("ws.error.game");
            setWsError(message);
          }
        } catch {
          setWsError(tr("ws.error.invalidMessage"));
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        if (retryRef.current < MAX_WS_RETRIES) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
          retryRef.current += 1;
          setWsError(tr("ws.error.reconnect", { n: retryRef.current, max: MAX_WS_RETRIES }));
          retryTimerRef.current = setTimeout(connect, delay);
        } else {
          setWsError(tr("ws.error.lost"));
        }
      };

      ws.onerror = () => {
        if (!cancelled) setConnected(false);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      retryRef.current = 0;
    };
  }, [gameId, enabled]);

  const sendMove = useCallback(
    (uci: string, spentMs?: number, telemetry?: Record<string, number | undefined>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: "jouer_coup",
            uci,
            spent_ms: spentMs,
            telemetry,
          })
        );
        return true;
      }
      return false;
    },
    []
  );

  const resign = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "abandonner_partie" }));
    }
  }, []);

  const startGame = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "demarrer_partie" }));
    }
  }, []);

  const sendChat = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed || wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify({ event: "chat", message: trimmed }));
    return true;
  }, []);

  const subscribeChat = useCallback((listener: ChatListener) => {
    chatListenersRef.current.add(listener);
    return () => {
      chatListenersRef.current.delete(listener);
    };
  }, []);

  return { connected, wsError, sendMove, resign, startGame, sendChat, subscribeChat };
}
