import { buildGameDisplayFromUciList } from "@/lib/chessDisplay";

export const REVIEW_START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface ReviewMove {
  uci?: string;
  san: string;
  eval?: number;
  class: string;
  cp_loss?: number;
  played_by_white?: boolean;
  best_san?: string | null;
  best_uci?: string | null;
  pv_san?: string | null;
}

export interface ReviewHighlight {
  played?: { from: string; to: string };
  best?: { from: string; to: string };
}

export interface ReviewBoardState {
  fen: string;
  lastMove: { from: string; to: string } | null;
  reviewHighlight: ReviewHighlight | null;
}

function uciSquares(uci: string): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

export function reviewBoardState(
  moves: ReviewMove[],
  selectedIdx: number | null,
  playerIsWhite: boolean
): ReviewBoardState {
  if (selectedIdx == null || selectedIdx < 0 || !moves[selectedIdx]) {
    return { fen: REVIEW_START_FEN, lastMove: null, reviewHighlight: null };
  }

  const move = moves[selectedIdx];
  const uciBefore = moves
    .slice(0, selectedIdx)
    .map((m) => m.uci)
    .filter((u): u is string => Boolean(u));

  const fenBefore = buildGameDisplayFromUciList(REVIEW_START_FEN, uciBefore).fen;
  const isUser = move.played_by_white === playerIsWhite;
  const isSuboptimal = ["inaccuracy", "mistake", "blunder"].includes(move.class);
  const played = move.uci ? uciSquares(move.uci) : null;
  const best = move.best_uci ? uciSquares(move.best_uci) : null;
  const showBestHint =
    isUser &&
    isSuboptimal &&
    played &&
    best &&
    move.best_uci !== move.uci;

  if (showBestHint) {
    return {
      fen: fenBefore,
      lastMove: null,
      reviewHighlight: { played, best },
    };
  }

  const uciAfter = [...uciBefore, move.uci].filter((u): u is string => Boolean(u));
  const after = buildGameDisplayFromUciList(REVIEW_START_FEN, uciAfter);
  return {
    fen: after.fen,
    lastMove: after.lastMove,
    reviewHighlight: null,
  };
}

export function firstUserMistakeIndex(
  moves: ReviewMove[],
  playerIsWhite: boolean
): number | null {
  const idx = moves.findIndex(
    (m) =>
      m.played_by_white === playerIsWhite &&
      ["inaccuracy", "mistake", "blunder"].includes(m.class)
  );
  return idx >= 0 ? idx : null;
}
