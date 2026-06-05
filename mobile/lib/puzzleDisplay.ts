import { Chess } from "chess.js";

export function buildFenFromUciMoves(startFen: string, uciMoves: string[]): string {
  const chess = new Chess(startFen);
  for (const uci of uciMoves) {
    try {
      chess.move(uci);
    } catch {
      break;
    }
  }
  return chess.fen();
}

export function lastMoveFromUci(uciMoves: string[]): { from: string; to: string } | null {
  const last = uciMoves[uciMoves.length - 1];
  if (!last || last.length < 4) return null;
  return { from: last.slice(0, 2), to: last.slice(2, 4) };
}

export function turnFromFen(fen: string): "w" | "b" {
  return fen.includes(" w ") ? "w" : "b";
}
