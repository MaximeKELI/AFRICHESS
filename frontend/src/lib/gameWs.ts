/** Helpers WebSocket — auth via Sec-WebSocket-Protocol (pas de JWT dans l'URL). */

import { WS_URL } from "@/lib/apiConfig";

export function wsGameUrl(gameId: string): string {
  return `${WS_URL}/ws/game/${gameId}/`;
}

export function wsMatchmakingUrl(): string {
  return `${WS_URL}/ws/matchmaking/`;
}

export function wsSimulUrl(sessionId: number): string {
  return `${WS_URL}/ws/simul/${sessionId}/`;
}

export function wsNotificationsUrl(): string {
  return `${WS_URL}/ws/notifications/`;
}

/** Deux sous-protocoles bearer + jwt (les points du JWT cassent un seul token). */
export function wsAuthProtocols(token: string): string[] {
  return ["bearer", token];
}
