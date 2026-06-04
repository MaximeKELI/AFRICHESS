/** Reprise de partie IA (localStorage). */

export interface SavedActiveGame {
  gameId: string;
  mode: string;
  orientation: "white" | "black";
  aiElo: number;
  savedAt: number;
}

const KEY = "africhess_active_game";

export function saveActiveGame(state: SavedActiveGame) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadActiveGame(): SavedActiveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedActiveGame;
  } catch {
    return null;
  }
}

export function clearActiveGame() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
