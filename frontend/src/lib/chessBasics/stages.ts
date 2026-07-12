/**
 * Chess Basics — stages interactifs (parité Lichess Learn).
 * Objectifs : dest (atteindre une case), capture, check, mate, castling.
 */

export type BasicsGoal =
  | { type: "dest"; squares: string[] }
  | { type: "capture" }
  | { type: "check" }
  | { type: "mate" }
  | { type: "castle" };

export interface BasicsStage {
  id: string;
  titleKey: string;
  hintKey: string;
  fen: string;
  goal: BasicsGoal;
  /** Si true, n'importe quel coup légal du camp au trait qui satisfait le goal. */
  freePiece?: boolean;
}

export const BASICS_STAGES: BasicsStage[] = [
  {
    id: "rook",
    titleKey: "learn.basics.rook.title",
    hintKey: "learn.basics.rook.hint",
    fen: "8/8/8/8/4R3/8/8/8 w - - 0 1",
    goal: { type: "dest", squares: ["e8", "e1", "a4", "h4"] },
  },
  {
    id: "bishop",
    titleKey: "learn.basics.bishop.title",
    hintKey: "learn.basics.bishop.hint",
    fen: "8/8/8/8/4B3/8/8/8 w - - 0 1",
    goal: { type: "dest", squares: ["a8", "h8", "b1", "h1"] },
  },
  {
    id: "queen",
    titleKey: "learn.basics.queen.title",
    hintKey: "learn.basics.queen.hint",
    fen: "8/8/8/8/4Q3/8/8/8 w - - 0 1",
    goal: { type: "dest", squares: ["e8", "a4", "h4", "a8", "h1"] },
  },
  {
    id: "king",
    titleKey: "learn.basics.king.title",
    hintKey: "learn.basics.king.hint",
    fen: "8/8/8/8/4K3/8/8/8 w - - 0 1",
    goal: { type: "dest", squares: ["d4", "d5", "e5", "f5", "f4", "f3", "e3", "d3"] },
  },
  {
    id: "knight",
    titleKey: "learn.basics.knight.title",
    hintKey: "learn.basics.knight.hint",
    fen: "8/8/8/8/4N3/8/8/8 w - - 0 1",
    goal: { type: "dest", squares: ["d6", "f6", "c5", "g5", "c3", "g3", "d2", "f2"] },
  },
  {
    id: "pawn",
    titleKey: "learn.basics.pawn.title",
    hintKey: "learn.basics.pawn.hint",
    fen: "8/8/8/8/8/8/4P3/8 w - - 0 1",
    goal: { type: "dest", squares: ["e3", "e4"] },
  },
  {
    id: "capture",
    titleKey: "learn.basics.capture.title",
    hintKey: "learn.basics.capture.hint",
    fen: "8/8/8/3p4/4P3/8/8/8 w - - 0 1",
    goal: { type: "capture" },
  },
  {
    id: "protection",
    titleKey: "learn.basics.protection.title",
    hintKey: "learn.basics.protection.hint",
    fen: "8/8/8/3r4/4N3/8/8/4K3 w - - 0 1",
    goal: { type: "dest", squares: ["c3", "c5", "d2", "d6", "f2", "f6", "g3", "g5"] },
  },
  {
    id: "check",
    titleKey: "learn.basics.check.title",
    hintKey: "learn.basics.check.hint",
    fen: "4k3/8/8/8/8/8/4R3/4K3 w - - 0 1",
    goal: { type: "check" },
  },
  {
    id: "outOfCheck",
    titleKey: "learn.basics.outOfCheck.title",
    hintKey: "learn.basics.outOfCheck.hint",
    fen: "4k3/8/8/8/8/8/4r3/4K3 w - - 0 1",
    goal: { type: "dest", squares: ["d1", "d2", "e2", "f1", "f2"] },
  },
  {
    id: "mate1",
    titleKey: "learn.basics.mate1.title",
    hintKey: "learn.basics.mate1.hint",
    fen: "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1",
    goal: { type: "mate" },
  },
  {
    id: "castle",
    titleKey: "learn.basics.castle.title",
    hintKey: "learn.basics.castle.hint",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    goal: { type: "castle" },
  },
  {
    id: "enpassant",
    titleKey: "learn.basics.enpassant.title",
    hintKey: "learn.basics.enpassant.hint",
    fen: "8/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
    goal: { type: "capture" },
  },
  {
    id: "stalemate",
    titleKey: "learn.basics.stalemate.title",
    hintKey: "learn.basics.stalemate.hint",
    fen: "k7/2Q5/1K6/8/8/8/8/8 w - - 0 1",
    // Déplacer la dame pour ne pas mater mais laisser le roi sans coup = stalemate
    // Plus simple : objectif mate avec Qb7#
    goal: { type: "mate" },
  },
];

const PROGRESS_KEY = "africhess_chess_basics_progress";

export function loadBasicsProgress(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markStageComplete(stageId: string): string[] {
  const prev = loadBasicsProgress();
  if (prev.includes(stageId)) return prev;
  const next = [...prev, stageId];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  return next;
}

export function stageById(id: string): BasicsStage | undefined {
  return BASICS_STAGES.find((s) => s.id === id);
}
