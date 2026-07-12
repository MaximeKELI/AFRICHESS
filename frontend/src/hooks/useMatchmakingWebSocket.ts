"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { wsAuthProtocols, wsMatchmakingUrl } from "@/lib/gameWs";
import { matchmakingTimeControl, type TimePresetId } from "@/lib/timeControl";
import { tr } from "@/lib/i18n/labels";

export function useMatchmakingWebSocket(
  enabled: boolean,
  mode: string,
  onMatch: (gameId: string, roomId: string) => void,
  timeOpts?: { isTimed: boolean; timePreset: string; isRated?: boolean; variant?: string }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMatchRef = useRef(onMatch);
  const listenOnlyRef = useRef(false);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(false);
  const [mmError, setMmError] = useState<string | null>(null);

  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  const search = useCallback((opts?: { listenOnly?: boolean }) => {
    listenOnlyRef.current = opts?.listenOnly ?? false;
    setMmError(null);
    setActive(true);
  }, []);

  const cancel = useCallback(() => {
    listenOnlyRef.current = false;
    setActive(false);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!enabled || !active) {
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.close();
      }
      return;
    }

    const token = Cookies.get("access_token");
    if (!token) {
      setMmError(tr("play.loginRequired"));
      setActive(false);
      setSearching(false);
      return;
    }

    let closed = false;
    let opened = false;
    const listenOnly = listenOnlyRef.current;
    const ws = new WebSocket(wsMatchmakingUrl(), wsAuthProtocols(token));
    wsRef.current = ws;
    setSearching(true);
    setMmError(null);

    ws.onopen = () => {
      opened = true;
      if (closed) return;
      if (listenOnly) return;
      const tc =
        timeOpts?.isTimed === false
          ? null
          : matchmakingTimeControl(
              mode,
              timeOpts?.isTimed ?? true,
              timeOpts?.isRated ?? true,
              (timeOpts?.timePreset ?? "3+2") as TimePresetId
            ) ?? null;
      ws.send(
        JSON.stringify({
          event: "rejoindre_file",
          mode,
          is_timed: timeOpts?.isTimed ?? true,
          is_rated: timeOpts?.isRated ?? true,
          time_control: tc,
          variant: timeOpts?.variant ?? "standard",
        })
      );
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === "match_found") {
          setActive(false);
          setSearching(false);
          onMatchRef.current(msg.data.game_id, msg.data.room_id);
          closed = true;
          ws.close();
        } else if (msg.event === "en_attente") {
          setSearching(true);
        } else if (msg.event === "error") {
          setMmError(msg.data?.message || tr("ws.error.matchmakingGeneric"));
          setActive(false);
          setSearching(false);
        }
      } catch {
        setMmError(tr("ws.error.matchmakingInvalid"));
        setActive(false);
        setSearching(false);
      }
    };

    ws.onclose = (ev) => {
      if (closed) return;
      setSearching(false);
      setActive(false);
      if (ev.code === 4001) {
        setMmError(tr("ws.error.matchmakingAuth"));
      } else if (ev.code === 1006 && !opened) {
        // Connexion interrompue avant établissement (ex. React Strict Mode).
        return;
      } else if (ev.code !== 1000) {
        setMmError(tr("ws.error.matchmaking"));
      }
    };

    ws.onerror = () => {
      /* onclose will report the failure */
    };

    return () => {
      closed = true;
      wsRef.current = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        if (ws.readyState === WebSocket.OPEN) {
          // Toujours quitter (y compris listenOnly) pour éviter les fantômes Redis/PG.
          ws.send(JSON.stringify({ event: "quitter_file" }));
        }
        ws.close();
      }
    };
  }, [
    enabled,
    active,
    mode,
    timeOpts?.isTimed,
    timeOpts?.timePreset,
    timeOpts?.isRated,
  ]);

  return { searching, mmError, search, cancel };
};
