"use client";

import { useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

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
        setError("Aucun coup analysé — vérifiez que la partie contient des coups valides.");
      } else {
        setError("Réponse serveur incomplète.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Analyse indisponible (moteur ou partie vide)."));
    } finally {
      setLoading(false);
    }
  };

  if (!completed) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Analyse Stockfish</h3>
      {!analysis && (
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="w-full py-2 rounded-lg border border-africhess-green text-africhess-green text-sm font-medium hover:bg-africhess-green/10 disabled:opacity-50"
        >
          {loading ? "Analyse en cours…" : "Analyser la partie"}
        </button>
      )}
      {error && <p className="text-xs text-africhess-terracotta">{error}</p>}
      {analysis && (
        <div className="text-sm space-y-2">
          <p>
            Gaffes blancs : <strong>{analysis.blunders_white}</strong> · Noirs :{" "}
            <strong>{analysis.blunders_black}</strong>
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
