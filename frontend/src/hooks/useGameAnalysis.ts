import { useCallback, useEffect, useState } from "react";
import { gamesApi } from "@/lib/api";
import {
  parseAnalysisPayload,
  type GameAnalysisData,
} from "@/lib/gameAnalysis";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";

interface UseGameAnalysisOptions {
  gameId: string;
  enabled: boolean;
  initialAnalysis?: GameAnalysisData | null;
  autoRun?: boolean;
}

export function useGameAnalysis({
  gameId,
  enabled,
  initialAnalysis = null,
  autoRun = false,
}: UseGameAnalysisOptions) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<GameAnalysisData | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.analyze(gameId);
      const payload = parseAnalysisPayload(data?.analysis);
      if (payload) {
        setAnalysis(payload);
      } else if (data?.analysis) {
        setError(t("chess.analysis.noMoves"));
      } else {
        setError(t("chess.analysis.incomplete"));
      }
    } catch (err: unknown) {
      setError(formatApiError(err, t("chess.analysis.unavailable")));
    } finally {
      setLoading(false);
    }
  }, [gameId, t]);

  useEffect(() => {
    if (initialAnalysis && !analysis) {
      setAnalysis(initialAnalysis);
    }
  }, [initialAnalysis, analysis]);

  useEffect(() => {
    if (!enabled || !autoRun || analysis || loading) return;
    void runAnalysis();
  }, [enabled, autoRun, analysis, loading, runAnalysis]);

  return { analysis, loading, error, runAnalysis, setAnalysis };
}
