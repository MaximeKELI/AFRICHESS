/**
 * Moteur puzzle style Chess.com — validation coup par coup + réponses adverses auto.
 */

import { Chess, type Square } from "chess.js";

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

function parsePromotion(uci: string): "q" | "r" | "b" | "n" | undefined {
  const p = uci[4]?.toLowerCase();
  if (p === "q" || p === "r" || p === "b" || p === "n") return p;
  return undefined;
}

export function normalizeUci(uci: string): string {
  return uci.toLowerCase().trim();
}

/** Compare UCI (tolère promotion implicite en dame). */
export function uciEquals(a: string, b: string): boolean {
  const na = normalizeUci(a);
  const nb = normalizeUci(b);
  if (na === nb) return true;
  if (na.slice(0, 4) !== nb.slice(0, 4)) return false;
  const promoA = na[4] || "q";
  const promoB = nb[4] || "q";
  return promoA === promoB;
}

export function buildPuzzleFen(startFen: string, moves: string[]): string {
  const chess = new Chess(startFen);
  for (const uci of moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = parsePromotion(uci);
    chess.move({ from, to, promotion });
  }
  return chess.fen();
}

export function chessAtPuzzleProgress(startFen: string, playedMoves: string[]): Chess | null {
  try {
    const fen = playedMoves.length ? buildPuzzleFen(startFen, playedMoves) : startFen;
    return new Chess(fen);
  } catch {
    return null;
  }
}

export function isLegalUci(chess: Chess, uci: string): boolean {
  const normalized = normalizeUci(uci);
  const from = normalized.slice(0, 2) as Square;
  const to = normalized.slice(2, 4) as Square;
  const promotion = parsePromotion(normalized);
  try {
    return chess.moves({ square: from, verbose: true }).some(
      (m) =>
        m.from === from &&
        m.to === to &&
        (promotion ? m.promotion === promotion : true)
    );
  } catch {
    return false;
  }
}

/** Normalise `solution_moves` (liste, JSON string, ou coups séparés). */
export function normalizeSolutionMoves(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((m) => normalizeUci(String(m ?? "")))
      .filter((u) => u.length >= 4);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return normalizeSolutionMoves(parsed);
    } catch {
      /* liste séparée par espaces/virgules */
    }
    return trimmed
      .split(/[\s,;]+/)
      .map((m) => normalizeUci(m))
      .filter((u) => u.length >= 4);
  }
  return [];
}

/**
 * Prochain coup du joueur dans la ligne solution, validé sur la position réelle.
 * Avance automatiquement les coups adverses prévus si nécessaire.
 */
export function nextPlayerSolutionMove(
  startFen: string,
  solutionMoves: string[],
  playedMoves: string[]
): string | null {
  const moves = normalizeSolutionMoves(solutionMoves);
  const solver = solverColor(startFen);
  const chess = chessAtPuzzleProgress(startFen, playedMoves);
  if (!chess) return null;

  const startIdx = playedMoves.length;

  for (let i = startIdx; i < moves.length; i++) {
    const uci = moves[i];
    if (!uci) return null;

    if (chess.turn() === solver) {
      return isLegalUci(chess, uci) ? uci : null;
    }

    // Coup adverse attendu dans la ligne — avancer la position pour trouver le prochain coup joueur
    if (!isLegalUci(chess, uci)) return null;
    chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: parsePromotion(uci),
    });
  }

  return null;
}

/**
 * UCI pour l'indice UI : strict d'abord, sinon prochain coup solution (affichage).
 * Évite « indisponible » quand la flèche peut quand même être dessinée.
 */
export function hintPlayerSolutionMove(
  startFen: string,
  solutionMoves: string[],
  playedMoves: string[]
): string | null {
  const strict = nextPlayerSolutionMove(startFen, solutionMoves, playedMoves);
  if (strict) return strict;

  const moves = normalizeSolutionMoves(solutionMoves);
  if (!moves.length) return null;

  const chess = chessAtPuzzleProgress(startFen, playedMoves);
  if (!chess) {
    const raw = moves[playedMoves.length];
    return raw && raw.length >= 4 ? raw : null;
  }

  const solver = solverColor(startFen);
  let idx = playedMoves.length;

  // Avancer soft les coups adverses légaux pour pointer le prochain coup joueur
  while (idx < moves.length && chess.turn() !== solver) {
    const uci = moves[idx];
    if (!isLegalUci(chess, uci)) break;
    chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: parsePromotion(uci),
    });
    idx += 1;
  }

  if (idx >= moves.length) return null;
  const candidate = moves[idx];
  return candidate.length >= 4 ? candidate : null;
}

/** Applique un coup joueur ; rejoue les coups adverses automatiquement. */
export function applyPuzzleMove(
  startFen: string,
  solutionMoves: string[],
  playedMoves: string[],
  uci: string
): PuzzleState {
  const normalized = normalizeUci(uci);
  const expected = nextPlayerSolutionMove(startFen, solutionMoves, playedMoves);

  if (!expected || !uciEquals(normalized, expected)) {
    return {
      fen: buildPuzzleFen(startFen, playedMoves),
      moves: playedMoves,
      complete: false,
      wrong: true,
      playerTurn: true,
    };
  }

  const solver = solverColor(startFen);
  let moves = [...playedMoves, expected];

  // Réponses automatiques de l'adversaire uniquement (pas les prochains coups joueur)
  while (moves.length < solutionMoves.length) {
    const c = chessAtPuzzleProgress(startFen, moves);
    if (!c || c.turn() === solver) break;
    const opponentMove = normalizeUci(solutionMoves[moves.length]);
    if (!opponentMove || !isLegalUci(c, opponentMove)) break;
    moves = [...moves, opponentMove];
  }

  const complete = moves.length >= solutionMoves.length;
  const fen = buildPuzzleFen(startFen, moves);
  const chess = new Chess(fen);
  const playerTurn = complete ? false : chess.turn() === solver;

  return { fen, moves, complete, wrong: false, playerTurn };
}

export function isPlayerTurn(startFen: string, playedMoves: string[]): boolean {
  const chess = chessAtPuzzleProgress(startFen, playedMoves);
  if (!chess) return false;
  return chess.turn() === solverColor(startFen);
}

export function puzzleOrientation(startFen: string): "white" | "black" {
  return solverColor(startFen) === "w" ? "white" : "black";
}

/** Aligne les coups joués sur le format exact de la ligne solution (API). */
export function alignMovesToSolution(played: string[], solution: string[]): string[] {
  return played.map((move, i) => {
    const expected = solution[i];
    if (!expected) return normalizeUci(move);
    return uciEquals(move, expected) ? normalizeUci(expected) : normalizeUci(move);
  });
}
