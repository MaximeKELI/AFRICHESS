"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";

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

/** Redirige vers /play quand un défi est accepté ou une partie est trouvée (WS notifications). */
export function GameInviteRedirect() {
  const { user } = useAuthStore();
  const router = useRouter();
  const joinedRef = useRef<Set<string>>(new Set());

  const onNew = useCallback(
    (raw: NotifPayload) => {
      const gameId = shouldAutoJoinGame(raw);
      if (!gameId || joinedRef.current.has(gameId)) return;
      joinedRef.current.add(gameId);
      const mode = raw.data?.mode;
      const qs = mode ? `?game=${gameId}&mode=${encodeURIComponent(mode)}` : `?game=${gameId}`;
      router.push(`/play${qs}`);
    },
    [router]
  );

  useNotificationsWebSocket(Boolean(user), () => {}, onNew);

  return null;
}
