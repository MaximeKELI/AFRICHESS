import type { AnalysisMove } from "@/lib/gameAnalysis";

export const MOVE_CLASS_ORDER = [
  "brilliant",
  "great",
  "best",
  "book",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
] as const;

export type MoveClassKey = (typeof MOVE_CLASS_ORDER)[number];

export type ClassificationCounts = Record<MoveClassKey, number>;

export function emptyClassificationCounts(): ClassificationCounts {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    book: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

function bump(counts: ClassificationCounts, moveClass: string) {
  if (moveClass in counts) {
    counts[moveClass as MoveClassKey] += 1;
  }
}

/** Compte par type de coup pour les Blancs ou les Noirs. */
export function countForColor(moves: AnalysisMove[], forWhite: boolean): ClassificationCounts {
  const counts = emptyClassificationCounts();
  for (const move of moves) {
    if (move.played_by_white !== forWhite) continue;
    bump(counts, move.class);
  }
  return counts;
}

/** Compte pour le joueur humain et l'adversaire. */
export function countForSides(
  moves: AnalysisMove[],
  playerIsWhite: boolean
): { player: ClassificationCounts; opponent: ClassificationCounts } {
  return {
    player: countForColor(moves, playerIsWhite),
    opponent: countForColor(moves, !playerIsWhite),
  };
}

export function totalMoves(counts: ClassificationCounts): number {
  return MOVE_CLASS_ORDER.reduce((sum, key) => sum + counts[key], 0);
}
