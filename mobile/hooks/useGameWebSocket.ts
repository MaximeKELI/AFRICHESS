import { useCallback, useEffect, useRef, useState } from "react";
import type { WsGamePayload } from "../lib/gameState";
import { getAccessToken } from "../lib/storage";
import { wsAuthProtocols, wsGamePath } from "../lib/ws";

const MAX_WS_RETRIES = 5;

type WsHandler = (payload: WsGamePayload) => void;

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

    let cancelled = false;

    const connect = async () => {
      if (cancelled) return;
      const token = await getAccessToken();
      if (!token) {
        setWsError("Session expirée");
        return;
      }

      const ws = new WebSocket(wsGamePath(gameId), wsAuthProtocols(token));
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
          const msg = JSON.parse(ev.data as string);
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
              typeof data?.message === "string" ? data.message : "Erreur WebSocket";
            setWsError(message);
          }
        } catch {
          setWsError("Message WebSocket invalide");
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        if (retryRef.current < MAX_WS_RETRIES) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
          retryRef.current += 1;
          setWsError(`Reconnexion ${retryRef.current}/${MAX_WS_RETRIES}…`);
          retryTimerRef.current = setTimeout(() => {
            void connect();
          }, delay);
        } else {
          setWsError("Connexion temps réel perdue");
        }
      };

      ws.onerror = () => {
        if (!cancelled) setConnected(false);
      };
    };

    void connect();

    return () => {
      cancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      retryRef.current = 0;
    };
  }, [gameId, enabled]);

  const resign = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "abandonner_partie" }));
      return true;
    }
    return false;
  }, []);

  return { connected, wsError, resign };
}
