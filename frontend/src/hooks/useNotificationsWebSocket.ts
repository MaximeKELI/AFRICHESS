"use client";

import { useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { wsAuthProtocols, wsNotificationsUrl } from "@/lib/gameWs";

export interface WsNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: { game_id?: string; mode?: string };
  is_read: boolean;
  created_at: string;
}

export function useNotificationsWebSocket(
  enabled: boolean,
  onSnapshot: (items: WsNotification[]) => void,
  onNew?: (item: WsNotification) => void
) {
  const onSnapshotRef = useRef(onSnapshot);
  const onNewRef = useRef(onNew);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onNewRef.current = onNew;
  }, [onSnapshot, onNew]);

  useEffect(() => {
    if (!enabled) return;

    const token = Cookies.get("access_token");
    if (!token) return;

    const ws = new WebSocket(wsNotificationsUrl(), wsAuthProtocols(token));

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === "notifications" && Array.isArray(msg.data)) {
          onSnapshotRef.current(msg.data);
        } else if (msg.event === "new_notification" && msg.data) {
          onNewRef.current?.(msg.data);
        }
      } catch {
        /* ignore malformed */
      }
    };

    return () => ws.close();
  }, [enabled]);
}
