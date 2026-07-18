import type { AnalysisMove } from "@/lib/gameAnalysis";
import { moveAccuracyFromCpLoss } from "@/lib/moveAccuracy";

export type Phase = "opening" | "middlegame" | "endgame";

export const REVIEW_PHASES: Phase[] = ["opening", "middlegame", "endgame"];

/** Déduit la phase d'un coup si le backend ne l'a pas fournie (mêmes seuils). */
function phaseForIndex(index: number): Phase {
  const moveNum = Math.floor(index / 2) + 1;
  if (moveNum <= 10) return "opening";
  if (moveNum >= 35) return "endgame";
  return "middlegame";
}

export interface SideValue {
  white: number | null;
  black: number | null;
}

export type PhaseAccuracies = Record<Phase, SideValue>;

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Précision (style Chess.com) par phase et par couleur, calculée depuis les coups. */
export function computePhaseAccuracies(moves: AnalysisMove[]): PhaseAccuracies {
  const buckets: Record<Phase, { white: number[]; black: number[] }> = {
    opening: { white: [], black: [] },
    middlegame: { white: [], black: [] },
    endgame: { white: [], black: [] },
  };
  moves.forEach((move, i) => {
    const phase = move.phase ?? phaseForIndex(i);
    const score = moveAccuracyFromCpLoss(move.cp_loss ?? 0);
    if (move.played_by_white) buckets[phase].white.push(score);
    else buckets[phase].black.push(score);
  });
  return {
    opening: { white: avg(buckets.opening.white), black: avg(buckets.opening.black) },
    middlegame: {
      white: avg(buckets.middlegame.white),
      black: avg(buckets.middlegame.black),
    },
    endgame: { white: avg(buckets.endgame.white), black: avg(buckets.endgame.black) },
  };
}

// Ancrages précision (%) -> ELO estimé — identiques au backend (analysis_utils.py).
const ELO_ACCURACY_ANCHORS: [number, number][] = [
  [0, 100],
  [20, 250],
  [40, 500],
  [50, 700],
  [60, 950],
  [70, 1200],
  [75, 1400],
  [80, 1650],
  [85, 1950],
  [90, 2250],
  [95, 2600],
  [98, 2850],
  [100, 3000],
];

const MIN_MOVES_FOR_ELO_ESTIMATE = 6;

/** Estime l'ELO « de la partie » depuis la précision d'un camp (repli client). */
export function estimateEloFromAccuracy(
  accuracy: number | null | undefined,
  moveCount: number
): number | null {
  if (accuracy == null || Number.isNaN(accuracy)) return null;
  if (moveCount < MIN_MOVES_FOR_ELO_ESTIMATE) return null;
  const acc = Math.max(0, Math.min(100, accuracy));
  let elo = ELO_ACCURACY_ANCHORS[ELO_ACCURACY_ANCHORS.length - 1][1];
  if (acc <= ELO_ACCURACY_ANCHORS[0][0]) {
    elo = ELO_ACCURACY_ANCHORS[0][1];
  } else if (acc >= ELO_ACCURACY_ANCHORS[ELO_ACCURACY_ANCHORS.length - 1][0]) {
    elo = ELO_ACCURACY_ANCHORS[ELO_ACCURACY_ANCHORS.length - 1][1];
  } else {
    for (let i = 0; i < ELO_ACCURACY_ANCHORS.length - 1; i++) {
      const [a0, e0] = ELO_ACCURACY_ANCHORS[i];
      const [a1, e1] = ELO_ACCURACY_ANCHORS[i + 1];
      if (acc >= a0 && acc <= a1) {
        const ratio = a1 > a0 ? (acc - a0) / (a1 - a0) : 0;
        elo = e0 + ratio * (e1 - e0);
        break;
      }
    }
  }
  return Math.round(elo / 10) * 10;
}

export function countMovesByColor(moves: AnalysisMove[]): { white: number; black: number } {
  let white = 0;
  let black = 0;
  for (const m of moves) {
    if (m.played_by_white) white++;
    else black++;
  }
  return { white, black };
}
