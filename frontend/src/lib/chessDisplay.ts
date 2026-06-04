import { Chess } from "chess.js";

export const PIECE_SYMBOLS: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export interface MoveRow {
  number: number;
  white?: string;
  black?: string;
}

export interface CapturedState {
  /** Pièces noires capturées par les blancs */
  byWhite: string[];
  /** Pièces blanches capturées par les noirs */
  byBlack: string[];
  materialWhite: number;
  materialBlack: number;
}

export interface ApiMove {
  uci: string;
  san: string;
  played_by_white: boolean;
  move_number: number;
  comment?: string;
}

export interface MoveComment {
  san: string;
  text: string;
  byAi: boolean;
  moveNumber: number;
}

export function commentsFromMoves(moves: ApiMove[], playerIsWhite: boolean): MoveComment[] {
  return moves
    .filter((m) => m.comment?.trim())
    .map((m) => ({
      san: m.san,
      text: m.comment!.trim(),
      byAi: m.played_by_white !== playerIsWhite,
      moveNumber: m.move_number,
    }));
}

export interface GameDisplayState {
  fen: string;
  moveRows: MoveRow[];
  captured: CapturedState;
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  turn: "w" | "b";
}

export function buildGameDisplayFromFen(fen: string): GameDisplayState {
  const chess = new Chess(fen === "start" ? undefined : fen);
  return extractDisplayState(chess, []);
}

export function buildGameDisplayFromUciList(startFen: string, uciMoves: string[]): GameDisplayState {
  const chess = new Chess(startFen);
  for (const uci of uciMoves) {
    try {
      chess.move(uci);
    } catch {
      break;
    }
  }
  return extractDisplayState(chess, []);
}

export function buildGameDisplayFromMoves(
  startFen: string,
  apiMoves: ApiMove[]
): GameDisplayState {
  const chess = new Chess(startFen === "start" ? undefined : startFen);
  const sorted = [...apiMoves].sort((a, b) => a.move_number - b.move_number);
  const applied: ApiMove[] = [];

  for (const m of sorted) {
    try {
      const move = chess.move(m.uci);
      if (move) applied.push(m);
    } catch {
      /* skip invalid */
    }
  }
  return extractDisplayState(chess, applied);
}

function extractDisplayState(chess: Chess, _applied: ApiMove[]): GameDisplayState {
  const history = chess.history({ verbose: true });
  const capturedByWhite: string[] = [];
  const capturedByBlack: string[] = [];

  for (const move of history) {
    if (move.captured) {
      const pieceKey = (move.color === "w" ? "b" : "w") + move.captured;
      if (move.color === "w") {
        capturedByWhite.push(pieceKey);
      } else {
        capturedByBlack.push(pieceKey);
      }
    }
  }

  capturedByWhite.sort((a, b) => PIECE_VALUE[b[1]] - PIECE_VALUE[a[1]]);
  capturedByBlack.sort((a, b) => PIECE_VALUE[b[1]] - PIECE_VALUE[a[1]]);

  const moveRows: MoveRow[] = [];
  const sans = chess.history();
  for (let i = 0; i < sans.length; i += 2) {
    moveRows.push({
      number: Math.floor(i / 2) + 1,
      white: sans[i],
      black: sans[i + 1],
    });
  }

  const lastVerbose = history[history.length - 1];
  const materialWhite = capturedByWhite.reduce((s, p) => s + PIECE_VALUE[p[1]], 0);
  const materialBlack = capturedByBlack.reduce((s, p) => s + PIECE_VALUE[p[1]], 0);

  return {
    fen: chess.fen(),
    moveRows,
    captured: {
      byWhite: capturedByWhite,
      byBlack: capturedByBlack,
      materialWhite,
      materialBlack,
    },
    lastMove: lastVerbose ? { from: lastVerbose.from, to: lastVerbose.to } : null,
    isCheck: chess.inCheck(),
    turn: chess.turn(),
  };
}
