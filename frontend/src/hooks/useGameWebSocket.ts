"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { wsAuthProtocols, wsGameUrl, wsMatchmakingUrl } from "@/lib/gameWs";
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

const MAX_WS_RETRIES = 5;

export function useGameWebSocket(
  gameId: string | null,
  enabled: boolean,
  onUpdate: WsHandler,
  onGameOver?: WsHandler
) {
  const [connected, setConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onGameOverRef.current = onGameOver;
  }, [onUpdate, onGameOver]);

  useEffect(() => {
    if (!gameId || !enabled) {
      setConnected(false);
      setWsError(null);
      return;
    }

    const token = Cookies.get("access_token");
    if (!token) {
      setWsError(tr("ws.error.session"));
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsGameUrl(gameId), wsAuthProtocols(token));
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
          if (event === "error") {
            const message =
              typeof data?.message === "string"
                ? data.message
                : "Erreur WebSocket partie.";
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

  const sendMove = useCallback((uci: string, spentMs?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: "jouer_coup",
          uci,
          spent_ms: spentMs,
        })
      );
      return true;
    }
    return false;
  }, []);

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

  return { connected, wsError, sendMove, resign, startGame };
}

export function useMatchmakingWebSocket(
  enabled: boolean,
  mode: string,
  onMatch: (gameId: string, roomId: string) => void,
  timeOpts?: { isTimed: boolean; timeMinutes: number }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [searching, setSearching] = useState(false);
  const [mmError, setMmError] = useState<string | null>(null);

  const search = useCallback(() => {
    const token = Cookies.get("access_token");
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsMatchmakingUrl(), wsAuthProtocols(token));
    wsRef.current = ws;
    setSearching(true);
    setMmError(null);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          event: "rejoindre_file",
          mode,
          is_timed: timeOpts?.isTimed ?? true,
          time_minutes: timeOpts?.isTimed ? timeOpts.timeMinutes : null,
        })
      );
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === "match_found") {
          setSearching(false);
          onMatch(msg.data.game_id, msg.data.room_id);
          ws.close();
        }
        if (msg.event === "en_attente") {
          setSearching(true);
        }
        if (msg.event === "error") {
          setMmError(msg.data?.message || tr("ws.error.matchmakingGeneric"));
          setSearching(false);
        }
      } catch {
        setMmError(tr("ws.error.matchmakingInvalid"));
        setSearching(false);
      }
    };

    ws.onclose = () => setSearching(false);
    ws.onerror = () => {
      setMmError(tr("ws.error.matchmaking"));
      setSearching(false);
    };
  }, [mode, onMatch, timeOpts?.isTimed, timeOpts?.timeMinutes]);

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "quitter_file" }));
      wsRef.current.close();
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!enabled) cancel();
    return () => {
      wsRef.current?.close();
    };
  }, [enabled, cancel]);

  return { searching, mmError, search, cancel };
}
