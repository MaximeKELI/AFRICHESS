import { computeMoveAccuraciesFromMoves } from "@/lib/moveAccuracy";

export interface AnalysisMove {
  uci?: string;
  san: string;
  eval: number;
  eval_before?: number;
  class: string;
  cp_loss?: number;
  played_by_white?: boolean;
  best_san?: string | null;
  best_uci?: string | null;
  pv_san?: string | null;
  phase?: "opening" | "middlegame" | "endgame";
  explanation_fr?: string;
}

export interface DeepReviewData {
  analysis_depth?: number;
  coaching_plan_fr?: string;
  coaching_plan_en?: string;
  phase_report?: Record<
    string,
    {
      white_accuracy?: number | null;
      black_accuracy?: number | null;
      summary_fr?: string;
      summary_en?: string;
    }
  >;
  turning_points?: {
    ply: number;
    san?: string;
    eval_swing_cp?: number;
    text_fr: string;
    text_en: string;
  }[];
  move_coaching?: { ply: number; coach_fr: string; coach_en: string; class: string }[];
  integrity_flags?: { code: string; text_fr: string; text_en: string }[];
}

export interface GameAnalysisData {
  accuracy_white: number | null;
  accuracy_black: number | null;
  move_accuracy_white?: number | null;
  move_accuracy_black?: number | null;
  blunders_white: number;
  blunders_black: number;
  best_moves_json: AnalysisMove[];
  summary_fr?: string;
  summary_en?: string;
  key_moments_json?: { ply: number; san: string; text: string; text_en?: string }[];
  deep_review_json?: DeepReviewData | null;
  analysis_depth_used?: number;
}

export function resolveMoveAccuracies(data: GameAnalysisData) {
  if (data.move_accuracy_white != null || data.move_accuracy_black != null) {
    return {
      white: data.move_accuracy_white ?? null,
      black: data.move_accuracy_black ?? null,
    };
  }
  return computeMoveAccuraciesFromMoves(data.best_moves_json);
}

export function parseAnalysisPayload(payload: unknown): GameAnalysisData | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const moves = p.best_moves_json;
  if (!Array.isArray(moves) || moves.length === 0) return null;
  return {
    accuracy_white: (p.accuracy_white as number | null) ?? null,
    accuracy_black: (p.accuracy_black as number | null) ?? null,
    move_accuracy_white: (p.move_accuracy_white as number | null) ?? null,
    move_accuracy_black: (p.move_accuracy_black as number | null) ?? null,
    blunders_white: Number(p.blunders_white ?? 0),
    blunders_black: Number(p.blunders_black ?? 0),
    best_moves_json: moves as AnalysisMove[],
    summary_fr: typeof p.summary_fr === "string" ? p.summary_fr : undefined,
    summary_en: typeof p.summary_en === "string" ? p.summary_en : undefined,
    key_moments_json: Array.isArray(p.key_moments_json)
      ? (p.key_moments_json as { ply: number; san: string; text: string }[])
      : undefined,
    deep_review_json:
      p.deep_review_json && typeof p.deep_review_json === "object"
        ? (p.deep_review_json as DeepReviewData)
        : undefined,
    analysis_depth_used:
      typeof p.analysis_depth_used === "number" ? p.analysis_depth_used : undefined,
  };
}
