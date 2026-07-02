"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { wsAuthProtocols, wsSimulUrl } from "@/lib/gameWs";

export interface SimulBoardUpdate {
  session_id: number;
  board_number: number;
  game_id: string;
  opponent: string;
  status: string;
  result?: string;
  fen?: string;
  move_count?: number;
}

type SimulHandler = (payload: SimulBoardUpdate) => void;
type SessionHandler = (payload: { session_id: number; status: string; boards_count: number }) => void;

export function useSimulWebSocket(
  sessionId: number | null,
  enabled: boolean,
  onBoardUpdate: SimulHandler,
  onSessionStatus?: SessionHandler
) {
  const [connected, setConnected] = useState(false);
  const onBoardRef = useRef(onBoardUpdate);
  const onSessionRef = useRef(onSessionStatus);

  useEffect(() => {
    onBoardRef.current = onBoardUpdate;
    onSessionRef.current = onSessionStatus;
  }, [onBoardUpdate, onSessionStatus]);

  useEffect(() => {
    if (!sessionId || !enabled) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    const token = Cookies.get("access_token");
    if (!token) return;

    const ws = new WebSocket(wsSimulUrl(sessionId), wsAuthProtocols(token));

    ws.onopen = () => {
      if (!cancelled) setConnected(true);
    };
    ws.onclose = () => {
      if (!cancelled) setConnected(false);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const { event, data } = msg;
        if (event === "simul_board_joined" || event === "simul_board_updated") {
          onBoardRef.current(data as SimulBoardUpdate);
        }
        if (event === "simul_session_status") {
          onSessionRef.current?.(data);
        }
      } catch {
        /* ignore */
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [sessionId, enabled]);

  return { connected };
}
