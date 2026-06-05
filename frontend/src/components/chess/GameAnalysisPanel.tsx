"use client";

import { useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";

interface AnalysisData {
  blunders_white: number;
  blunders_black: number;
  best_moves_json: Array<{ san: string; eval: number; class: string }>;
}

interface GameAnalysisPanelProps {
  gameId: string;
  completed: boolean;
}

export function GameAnalysisPanel({ gameId, completed }: GameAnalysisPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.analyze(gameId);
      const payload = data?.analysis;
      if (payload?.best_moves_json?.length) {
        setAnalysis(payload);
      } else if (payload) {
        setError(t("chess.analysis.noMoves"));
      } else {
        setError(t("chess.analysis.incomplete"));
      }
    } catch (err: unknown) {
      setError(formatApiError(err, t("chess.analysis.unavailable")));
    } finally {
      setLoading(false);
    }
  };

  if (!completed) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">{t("chess.analysis.title")}</h3>
      <p className="text-[10px] opacity-50">{t("chess.analysis.hint")}</p>
      {!analysis && (
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="w-full py-2 rounded-lg border border-africhess-green text-africhess-green text-sm font-medium hover:bg-africhess-green/10 disabled:opacity-50"
        >
          {loading ? t("chess.analysis.running") : t("chess.analysis.run")}
        </button>
      )}
      {error && <p className="text-xs text-africhess-terracotta">{error}</p>}
      {analysis && (
        <div className="text-sm space-y-2">
          <p>
            {t("chess.analysis.blunders", {
              white: analysis.blunders_white,
              black: analysis.blunders_black,
            })}
          </p>
          <ul className="max-h-40 overflow-y-auto text-xs space-y-1 opacity-80">
            {analysis.best_moves_json?.slice(0, 12).map((e, i) => (
              <li key={i}>
                <span className="font-mono text-africhess-gold">{e.san}</span> —{" "}
                <span className="capitalize">{e.class}</span>
                {e.eval != null && (
                  <span className="opacity-60"> ({e.eval})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
