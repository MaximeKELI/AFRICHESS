import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { computeMoveAccuraciesFromMoves } from "@/lib/moveAccuracy";

interface PgnMoveRow {
  san: string;
  uci?: string;
  eval_before?: number;
  eval_after?: number;
  centipawn_loss?: number;
  classification: string;
  best_san?: string | null;
  best_uci?: string | null;
  pv_san?: string | null;
  explanation_fr?: string;
}

interface PgnAnalysisPayload {
  moves: PgnMoveRow[];
  summary?: {
    blunders?: number;
    mistakes?: number;
    inaccuracies?: number;
    accuracy_estimate?: number;
  };
  summary_fr?: string;
}

/** Convertit la réponse PGN learning en format GameReview unifié. */
export function pgnToGameAnalysis(data: PgnAnalysisPayload): GameAnalysisData {
  const best_moves_json = data.moves.map((m, i) => ({
    uci: m.uci,
    san: m.san,
    eval: m.eval_after ?? 0,
    eval_before: m.eval_before,
    class: m.classification,
    cp_loss: m.centipawn_loss,
    played_by_white: i % 2 === 0,
    best_san: m.best_san ?? null,
    best_uci: m.best_uci ?? null,
    pv_san: m.pv_san ?? null,
    explanation_fr: m.explanation_fr,
  }));

  const blunders = data.summary?.blunders ?? 0;
  const mistakes = data.summary?.mistakes ?? 0;
  const acc = computeMoveAccuraciesFromMoves(best_moves_json);
  const est = data.summary?.accuracy_estimate;

  return {
    accuracy_white: est ?? acc.white,
    accuracy_black: est ?? acc.black,
    move_accuracy_white: acc.white,
    move_accuracy_black: acc.black,
    blunders_white: Math.ceil(blunders / 2),
    blunders_black: Math.floor(blunders / 2),
    best_moves_json,
    summary_fr: data.summary_fr,
    summary_en: data.summary_fr,
  };
}
