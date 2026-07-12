/** Entraînement vision : coordonnées et cases */

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export type VisionDrillType = "coordinate" | "square_color";

export function randomCoordinate(): string {
  const file = FILES[Math.floor(Math.random() * FILES.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return `${file}${rank}`;
}

/** Case claire ou foncée (perspective blancs) */
export function squareColor(square: string): "light" | "dark" {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  return (file + rank) % 2 === 0 ? "light" : "dark";
}

export function isValidSquare(square: string): boolean {
  return /^[a-h][1-8]$/.test(square);
}

/** Durée du mode chrono Lichess (secondes). */
export const COORDINATE_TIMED_SECONDS = 30;
