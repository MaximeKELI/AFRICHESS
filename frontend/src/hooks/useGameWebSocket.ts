"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

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

export function useGameWebSocket(
  gameId: string | null,
  enabled: boolean,
  onUpdate: WsHandler,
  onGameOver?: WsHandler
) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onGameOverRef.current = onGameOver;
  }, [onUpdate, onGameOver]);

  useEffect(() => {
    if (!gameId || !enabled) {
      setConnected(false);
      return;
    }

    const token = Cookies.get("access_token");
    if (!token) return;

    const url = `${WS_BASE}/ws/game/${gameId}/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
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
          console.warn("[WS]", data?.message || data);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
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

  return { connected, sendMove, resign, startGame };
}

export function useMatchmakingWebSocket(
  enabled: boolean,
  mode: string,
  onMatch: (gameId: string, roomId: string) => void,
  timeOpts?: { isTimed: boolean; timeMinutes: number }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [searching, setSearching] = useState(false);

  const search = useCallback(() => {
    const token = Cookies.get("access_token");
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = `${WS_BASE}/ws/matchmaking/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setSearching(true);

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
      const msg = JSON.parse(ev.data);
      if (msg.event === "match_found") {
        setSearching(false);
        onMatch(msg.data.game_id, msg.data.room_id);
        ws.close();
      }
      if (msg.event === "en_attente") {
        setSearching(true);
      }
    };

    ws.onclose = () => setSearching(false);
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

  return { searching, search, cancel };
}
