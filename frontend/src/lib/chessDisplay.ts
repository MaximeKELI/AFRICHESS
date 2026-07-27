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

export function commentsFromMoves(
  moves: ApiMove[],
  playerIsWhite: boolean,
  _vsAi = true
): MoveComment[] {
  return moves
    .filter((m) => m.comment?.trim())
    .map((m) => {
      const byOpponent = m.played_by_white !== playerIsWhite;
      return {
        san: m.san,
        text: m.comment!.trim(),
        byAi: byOpponent,
        moveNumber: m.move_number,
      };
    });
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

/**
 * Met à jour l'affichage en appliquant seulement les nouveaux coups (O(k) au lieu de O(n)).
 * Retourne `null` si le cache est désynchronisé (ex. FEN déjà avancé par optimistic)
 * — l'appelant doit alors reconstruire depuis la liste complète.
 */
export function appendApiMovesToDisplay(
  prev: GameDisplayState,
  newMoves: ApiMove[]
): GameDisplayState | null {
  if (!newMoves.length) return prev;

  const chess = new Chess(prev.fen === "start" ? undefined : prev.fen);
  const appliedVerbose: Array<{ captured?: string; color: string; from: string; to: string }> = [];

  for (const m of newMoves) {
    try {
      const verbose = chess.move(m.uci);
      if (!verbose) return null;
      appliedVerbose.push({
        captured: verbose.captured,
        color: verbose.color,
        from: verbose.from,
        to: verbose.to,
      });
    } catch {
      /* Cache incrémental désynchronisé (ex. coup IA après optimistic). */
      return null;
    }
  }

  const captured = {
    byWhite: [...prev.captured.byWhite],
    byBlack: [...prev.captured.byBlack],
    materialWhite: prev.captured.materialWhite,
    materialBlack: prev.captured.materialBlack,
  };

  for (const v of appliedVerbose) {
    if (!v.captured) continue;
    const pieceKey = (v.color === "w" ? "b" : "w") + v.captured;
    if (v.color === "w") {
      captured.byWhite.push(pieceKey);
      captured.materialWhite += PIECE_VALUE[v.captured];
    } else {
      captured.byBlack.push(pieceKey);
      captured.materialBlack += PIECE_VALUE[v.captured];
    }
  }
  captured.byWhite.sort((a, b) => PIECE_VALUE[b[1]] - PIECE_VALUE[a[1]]);
  captured.byBlack.sort((a, b) => PIECE_VALUE[b[1]] - PIECE_VALUE[a[1]]);

  const moveRows = [...prev.moveRows];
  for (const m of newMoves) {
    if (m.played_by_white) {
      moveRows.push({ number: m.move_number, white: m.san });
    } else {
      const row = moveRows.find((r) => r.number === m.move_number);
      if (row) row.black = m.san;
      else moveRows.push({ number: m.move_number, black: m.san });
    }
  }

  const last = appliedVerbose.at(-1);
  return {
    fen: chess.fen(),
    moveRows,
    captured,
    lastMove: last ? { from: last.from, to: last.to } : null,
    isCheck: chess.inCheck(),
    turn: chess.turn(),
  };
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
