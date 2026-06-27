/** Règles Solo Chess : captures obligatoires, gagner en capturant toutes les pièces adverses */

import { Chess, Square } from "chess.js";

export interface SoloLevel {
  id: number;
  fen: string;
  labelFr: string;
  labelEn: string;
}

export const SOLO_LEVELS: SoloLevel[] = [
  {
    id: 1,
    fen: "k7/8/8/8/4q3/8/8/4Q2K w - - 0 1",
    labelFr: "Dame vs dame",
    labelEn: "Queen vs queen",
  },
  {
    id: 2,
    fen: "k7/8/8/8/4r3/8/8/4R2K w - - 0 1",
    labelFr: "Tour vs tour",
    labelEn: "Rook vs rook",
  },
  {
    id: 3,
    fen: "k7/8/8/8/4n3/8/8/4N2K w - - 0 1",
    labelFr: "Cavalier vs cavalier",
    labelEn: "Knight vs knight",
  },
  {
    id: 4,
    fen: "k7/8/8/3p4/8/4P3/8/4K3 w - - 0 1",
    labelFr: "Pions face à face",
    labelEn: "Pawn face-off",
  },
];

/** Coups légaux en Solo Chess (captures uniquement si disponibles) */
export function soloLegalMoves(chess: Chess): string[] {
  const moves = chess.moves({ verbose: true });
  const captures = moves.filter((m) => m.captured);
  const pool = captures.length > 0 ? captures : moves;
  return pool.map((m) => m.san);
}

export function soloMoveAllowed(chess: Chess, from: Square, to: Square): boolean {
  const moves = chess.moves({ square: from, verbose: true });
  const captures = moves.filter((m) => m.captured);
  const pool = captures.length > 0 ? captures : moves;
  return pool.some((m) => m.from === from && m.to === to);
}

/** Victoire : une seule pièce (hors rois) restante */
export function soloVictory(chess: Chess): boolean {
  const board = chess.board().flat().filter((p) => p && p.type !== "k");
  return board.length <= 1;
}
