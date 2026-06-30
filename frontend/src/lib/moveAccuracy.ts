import type { AnalysisMove } from "@/lib/gameAnalysis";

/** Précision d'un coup à partir de la perte en centipawns (formule Chess.com). */
export function moveAccuracyFromCpLoss(cpLoss: number): number {
  const cp = Math.max(0, cpLoss);
  const raw = 103.1668 * Math.exp(-0.04354 * cp ** 0.9909) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

export interface SideAccuracies {
  white: number | null;
  black: number | null;
}

function roundAccuracy(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Calcule la précision des coups (moyenne CPL) depuis les coups analysés. */
export function computeMoveAccuraciesFromMoves(moves: AnalysisMove[]): SideAccuracies {
  const white: number[] = [];
  const black: number[] = [];
  for (const move of moves) {
    const score = moveAccuracyFromCpLoss(move.cp_loss ?? 0);
    if (move.played_by_white) white.push(score);
    else black.push(score);
  }
  return {
    white: white.length ? roundAccuracy(white.reduce((a, b) => a + b, 0) / white.length) : null,
    black: black.length ? roundAccuracy(black.reduce((a, b) => a + b, 0) / black.length) : null,
  };
}

export function formatMoveAccuracy(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatClassificationAccuracy(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}%`;
}
