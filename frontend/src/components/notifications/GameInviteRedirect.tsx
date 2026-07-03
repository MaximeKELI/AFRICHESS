"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";
import { gamesApi } from "@/lib/api";

interface NotifPayload {
  type?: string;
  data?: {
    game_id?: string;
    mode?: string;
    challenge_id?: number;
    action?: string;
  };
}

function shouldAutoJoinGame(n: NotifPayload): string | null {
  const gameId = n.data?.game_id;
  if (!gameId) return null;
  if (n.type === "match_found") return gameId;
  if (n.type === "game_invite" && n.data?.challenge_id && gameId) return gameId;
  return null;
}

/** Redirige vers /play quand un défi est accepté ou une partie est trouvée (WS + polling). */
export function GameInviteRedirect() {
  const { user } = useAuthStore();
  const router = useRouter();
  const joinedRef = useRef<Set<string>>(new Set());
  const pendingChallengeIds = useRef<Set<number>>(new Set());

  const goToGame = useCallback(
    (gameId: string, mode?: string) => {
      if (joinedRef.current.has(gameId)) return;
      joinedRef.current.add(gameId);
      const qs = mode ? `?game=${gameId}&mode=${encodeURIComponent(mode)}` : `?game=${gameId}`;
      router.push(`/play${qs}`);
    },
    [router]
  );

  const onNew = useCallback(
    (raw: NotifPayload) => {
      const gameId = shouldAutoJoinGame(raw);
      if (!gameId) return;
      goToGame(gameId, raw.data?.mode);
    },
    [goToGame]
  );

  useNotificationsWebSocket(Boolean(user), () => {}, onNew);

  // Secours si le WS est indisponible : suit les défis envoyés en attente.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await gamesApi.sentChallenges();
        if (cancelled) return;
        for (const c of data) {
          if (c.status === "pending") pendingChallengeIds.current.add(c.id);
        }
        for (const c of data) {
          if (
            c.status === "accepted" &&
            c.game_id &&
            pendingChallengeIds.current.has(c.id)
          ) {
            pendingChallengeIds.current.delete(c.id);
            goToGame(c.game_id, c.mode);
          }
        }
      } catch {
        /* ignore */
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, goToGame]);

  return null;
}
