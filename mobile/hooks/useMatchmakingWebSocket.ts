import { useCallback, useEffect, useRef, useState } from "react";
import { gamesApi } from "../lib/api";
import { getAccessToken } from "../lib/storage";
import { wsAuthProtocols, wsMatchmakingPath } from "../lib/ws";

export function useMatchmakingWebSocket(
  enabled: boolean,
  mode: string,
  onMatch: (gameId: string) => void,
  timeOpts?: { isTimed: boolean; timeControl: string; isRated?: boolean }
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

    setSearching(true);
    setMmError(null);

    try {
      const { data, status } = await gamesApi.matchmaking(mode, {
        is_timed: timeOpts?.isTimed ?? true,
        is_rated: timeOpts?.isRated ?? true,
        time_control: timeOpts?.timeControl ?? "3+2",
      });
      if (status === 201 && data.id) {
        setSearching(false);
        onMatchRef.current(data.id);
        return;
      }
    } catch {
      /* repli WS ci-dessous */
    }

    wsRef.current?.close();
    const ws = new WebSocket(wsMatchmakingPath(), wsAuthProtocols(token));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          event: "rejoindre_file",
          mode,
          is_timed: timeOpts?.isTimed ?? true,
          is_rated: timeOpts?.isRated ?? true,
          time_control: timeOpts?.timeControl ?? "3+2",
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
  }, [mode, timeOpts?.isTimed, timeOpts?.timeControl, timeOpts?.isRated]);

  const cancel = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "quitter_file" }));
      wsRef.current.close();
    }
    try {
      await gamesApi.matchmaking(mode, { is_timed: false });
    } catch {
      /* ignore */
    }
    setSearching(false);
  }, [mode]);

  useEffect(() => {
    if (!enabled) void cancel();
    return () => {
      wsRef.current?.close();
    };
  }, [enabled, cancel]);

  return { searching, mmError, search, cancel };
}
