/** Crazyhouse — parsing pocket depuis le FEN. */

export interface CrazyhousePockets {
  white: string[];
  black: string[];
}

export function parsePocketsFromFen(fen: string): CrazyhousePockets {
  const m = fen.match(/\[([^\]]*)\]/);
  if (!m) return { white: [], black: [] };
  const raw = m[1];
  const chars = raw.split("");
  return {
    white: chars.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()),
    black: chars.filter((c) => c === c.toLowerCase() && c !== c.toUpperCase()),
  };
}

export function dropUci(piece: string, square: string): string {
  return `${piece.toUpperCase()}@${square.toLowerCase()}`;
}

export function pocketForPlayer(
  pockets: CrazyhousePockets,
  playerColor: "w" | "b"
): string[] {
  return playerColor === "w" ? pockets.white : pockets.black;
}
