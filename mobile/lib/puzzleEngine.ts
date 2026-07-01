import { Chess } from "chess.js";

export interface PuzzleState {
  fen: string;
  moves: string[];
  complete: boolean;
  wrong: boolean;
  playerTurn: boolean;
}

export function solverColor(fen: string): "w" | "b" {
  return fen.includes(" w ") ? "w" : "b";
}

export function buildPuzzleFen(startFen: string, moves: string[]): string {
  const chess = new Chess(startFen);
  for (const uci of moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    chess.move({ from, to, promotion });
  }
  return chess.fen();
}

export function applyPuzzleMove(
  startFen: string,
  solutionMoves: string[],
  playedMoves: string[],
  uci: string
): PuzzleState {
  const normalized = uci.toLowerCase().trim();
  const expected = solutionMoves[playedMoves.length]?.toLowerCase();

  if (!expected || normalized !== expected) {
    return {
      fen: buildPuzzleFen(startFen, playedMoves),
      moves: playedMoves,
      complete: false,
      wrong: true,
      playerTurn: true,
    };
  }

  let moves = [...playedMoves, normalized];

  while (moves.length < solutionMoves.length) {
    const next = solutionMoves[moves.length].toLowerCase();
    moves = [...moves, next];
  }

  const complete = moves.length >= solutionMoves.length;
  const fen = buildPuzzleFen(startFen, moves);
  const chess = new Chess(fen);
  const color = solverColor(startFen);
  const playerTurn = complete ? false : chess.turn() === color;

  return { fen, moves, complete, wrong: false, playerTurn };
}

export function isPlayerTurn(startFen: string, playedMoves: string[]): boolean {
  if (!playedMoves.length) return true;
  const fen = buildPuzzleFen(startFen, playedMoves);
  const chess = new Chess(fen);
  return chess.turn() === solverColor(startFen);
}
