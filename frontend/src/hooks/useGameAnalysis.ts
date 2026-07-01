import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Ne pas relancer l'analyse si initialAnalysis est déjà présent */
  cacheFirst?: boolean;
}

const SYNC_TIMEOUT_MS = 45000;
const ASYNC_POLL_MS = 2500;
const ASYNC_MAX_MS = 120000;

async function pollAsyncAnalysis(
  gameId: string,
  signal: AbortSignal
): Promise<GameAnalysisData | null> {
  const started = Date.now();
  while (Date.now() - started < ASYNC_MAX_MS) {
    if (signal.aborted) return null;
    const { data } = await gamesApi.analyzeStatus(gameId);
    if (data.status === "completed" && data.analysis) {
      return parseAnalysisPayload(data.analysis);
    }
    if (data.status === "failed") {
      throw new Error(typeof data.error === "string" ? data.error : "Analysis failed");
    }
    await new Promise((r) => setTimeout(r, ASYNC_POLL_MS));
  }
  throw new Error("Analysis timeout");
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
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!gameId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const syncPromise = gamesApi.analyze(gameId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new Error("SYNC_TIMEOUT")), SYNC_TIMEOUT_MS);
        controller.signal.addEventListener("abort", () => clearTimeout(id));
      });
      try {
        const { data } = await Promise.race([syncPromise, timeoutPromise]);
        const payload = parseAnalysisPayload(data?.analysis);
        if (payload) {
          setAnalysis(payload);
          return;
        }
        if (data?.analysis) {
          setError(t("chess.analysis.noMoves"));
          return;
        }
        setError(t("chess.analysis.incomplete"));
      } catch (syncErr) {
        if (controller.signal.aborted) return;
        await gamesApi.analyzeAsync(gameId);
        const payload = await pollAsyncAnalysis(gameId, controller.signal);
        if (payload) setAnalysis(payload);
        else setError(t("chess.analysis.incomplete"));
        if (syncErr instanceof Error && syncErr.message !== "SYNC_TIMEOUT") {
          /* async succeeded */
        }
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(formatApiError(err, t("chess.analysis.unavailable")));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  return { analysis, loading, error, runAnalysis, setAnalysis };
}
