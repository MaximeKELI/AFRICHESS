import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "../lib/storage";
import { WS_BASE } from "../lib/ws";

export function useMatchmakingWebSocket(
  enabled: boolean,
  mode: string,
  onMatch: (gameId: string) => void,
  timeOpts?: { isTimed: boolean; timeMinutes: number }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [searching, setSearching] = useState(false);
  const [mmError, setMmError] = useState<string | null>(null);
  const onMatchRef = useRef(onMatch);

  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  const search = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setMmError("Connexion requise");
      return;
    }

    wsRef.current?.close();
    const url = `${WS_BASE}/ws/matchmaking/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
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
        const msg = JSON.parse(ev.data as string);
        if (msg.event === "match_found") {
          setSearching(false);
          onMatchRef.current(msg.data.game_id);
          ws.close();
        }
        if (msg.event === "error") {
          setMmError(msg.data?.message ?? "Erreur matchmaking");
          setSearching(false);
        }
      } catch {
        setMmError("Réponse matchmaking invalide");
        setSearching(false);
      }
    };

    ws.onclose = () => setSearching(false);
    ws.onerror = () => {
      setMmError("WebSocket matchmaking indisponible");
      setSearching(false);
    };
  }, [mode, timeOpts?.isTimed, timeOpts?.timeMinutes]);

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
