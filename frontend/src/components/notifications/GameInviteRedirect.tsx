"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  useNotificationsWebSocket,
  type WsNotification,
} from "@/hooks/useNotificationsWebSocket";
import { gamesApi, notificationsApi } from "@/lib/api";

/** Fenêtre pendant laquelle une notif/défi accepté déclenche encore la redirection auto. */
const RECENT_MS = 3 * 60 * 1000;

interface NotifData {
  game_id?: string;
  mode?: string;
  challenge_id?: number;
}

function gameIdFromNotif(n: WsNotification): string | null {
  const data = (n.data ?? {}) as NotifData;
  if (!data.game_id) return null;
  if (n.type === "match_found") return data.game_id;
  if (n.type === "game_invite" && data.challenge_id) return data.game_id;
  return null;
}

function isRecent(iso?: string | null): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return Date.now() - t < RECENT_MS;
}

/**
 * Redirige automatiquement vers /play quand un défi est accepté (des deux côtés).
 * Écoute le WebSocket notifications (snapshot + temps réel) avec repli sur polling HTTP.
 */
export function GameInviteRedirect() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const joinedRef = useRef<Set<string>>(new Set());

  const goToGame = useCallback(
    (gameId: string, mode?: string) => {
      if (joinedRef.current.has(gameId)) return;
      if (pathname === "/play" && typeof window !== "undefined") {
        const current = new URLSearchParams(window.location.search).get("game");
        if (current === gameId) {
          joinedRef.current.add(gameId);
          return;
        }
      }
      joinedRef.current.add(gameId);
      const qs = mode
        ? `?game=${gameId}&mode=${encodeURIComponent(mode)}`
        : `?game=${gameId}`;
      router.push(`/play${qs}`);
    },
    [router, pathname]
  );

  const handleNotif = useCallback(
    (n: WsNotification) => {
      if (n.is_read || !isRecent(n.created_at)) return;
      const gameId = gameIdFromNotif(n);
      if (!gameId || joinedRef.current.has(gameId)) return;
      // Marque lue pour éviter une redirection en boucle après rechargement.
      notificationsApi.markRead(n.id).catch(() => {});
      goToGame(gameId, (n.data as NotifData)?.mode);
    },
    [goToGame]
  );

  const handleSnapshot = useCallback(
    (items: WsNotification[]) => {
      for (const n of items) handleNotif(n);
    },
    [handleNotif]
  );

  useNotificationsWebSocket(Boolean(user), handleSnapshot, handleNotif);

  // Repli HTTP : suit les défis envoyés récemment acceptés (WS indisponible/rechargement).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await gamesApi.sentChallenges();
        if (cancelled) return;
        for (const c of data) {
          if (
            c.status === "accepted" &&
            c.game_id &&
            !joinedRef.current.has(c.game_id) &&
            isRecent(c.responded_at ?? c.created_at)
          ) {
            goToGame(c.game_id, c.mode);
          }
        }
      } catch {
        /* ignore */
      }
    };

    poll();
    const timer = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, goToGame]);

  return null;
}
