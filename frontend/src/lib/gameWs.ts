/** Helpers WebSocket — auth via Sec-WebSocket-Protocol (pas de JWT dans l'URL). */

export function wsGameUrl(gameId: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${base}/ws/game/${gameId}/`;
}

export function wsMatchmakingUrl(): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${base}/ws/matchmaking/`;
}

export function wsNotificationsUrl(): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${base}/ws/notifications/`;
}

/** Protocole bearer.<jwt> — évite les fuites dans les logs proxy. */
export function wsAuthProtocols(token: string): string[] {
  return [`bearer.${token}`];
}
