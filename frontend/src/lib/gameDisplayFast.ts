import type { ApiMove } from "./chessDisplay";

/** Dernier coup pour surligner sans rejouer toute la partie. */
export function lastMoveFromMoves(moves?: ApiMove[]): { from: string; to: string } | null {
  const last = moves?.[moves.length - 1];
  if (!last?.uci || last.uci.length < 4) return null;
  return { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) };
}

export function turnFromFen(fen: string): "w" | "b" {
  return fen.includes(" w ") ? "w" : "b";
}
