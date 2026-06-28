export interface AnalysisMove {
  uci?: string;
  san: string;
  eval: number;
  class: string;
  cp_loss?: number;
  played_by_white?: boolean;
  best_san?: string | null;
  best_uci?: string | null;
  pv_san?: string | null;
}

export interface GameAnalysisData {
  accuracy_white: number | null;
  accuracy_black: number | null;
  blunders_white: number;
  blunders_black: number;
  best_moves_json: AnalysisMove[];
  summary_fr?: string;
  key_moments_json?: { ply: number; san: string; text: string }[];
}

export function parseAnalysisPayload(payload: unknown): GameAnalysisData | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const moves = p.best_moves_json;
  if (!Array.isArray(moves) || moves.length === 0) return null;
  return {
    accuracy_white: (p.accuracy_white as number | null) ?? null,
    accuracy_black: (p.accuracy_black as number | null) ?? null,
    blunders_white: Number(p.blunders_white ?? 0),
    blunders_black: Number(p.blunders_black ?? 0),
    best_moves_json: moves as AnalysisMove[],
    summary_fr: typeof p.summary_fr === "string" ? p.summary_fr : undefined,
    key_moments_json: Array.isArray(p.key_moments_json)
      ? (p.key_moments_json as { ply: number; san: string; text: string }[])
      : undefined,
  };
}
