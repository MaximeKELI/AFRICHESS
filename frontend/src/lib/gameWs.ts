/** Helpers WebSocket — voir aussi hooks/useGameWebSocket.ts */

export function wsGameUrl(gameId: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${base}/ws/game/${gameId}/?token=${encodeURIComponent(token)}`;
}

export function wsMatchmakingUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${base}/ws/matchmaking/?token=${encodeURIComponent(token)}`;
}

/**
 * Exemple connexion brute (navigateur / console) :
 *
 * const token = document.cookie.match(/access_token=([^;]+)/)?.[1];
 * const ws = new WebSocket(`ws://localhost:8000/ws/game/GAME_UUID/?token=${token}`);
 * ws.onmessage = (e) => console.log(JSON.parse(e.data));
 * ws.onopen = () => ws.send(JSON.stringify({ event: "rejoindre_partie" }));
 * ws.send(JSON.stringify({ event: "jouer_coup", uci: "e2e4", spent_ms: 1200 }));
 */
