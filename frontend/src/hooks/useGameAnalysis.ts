import { useCallback, useEffect, useRef, useState } from "react";
import { gamesApi } from "@/lib/api";
import {
  isAnalysisIncomplete,
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
  /** Attendre l'analyse auto (cache/WS) avant de relancer le moteur */
  cacheFirst?: boolean;
  /** Nombre de coups de la partie — détecte les anciennes analyses tronquées */
  moveCount?: number;
}

const SYNC_TIMEOUT_MS = 18000;
const ASYNC_POLL_MS = 1200;
const ASYNC_MAX_MS = 90000;
const AUTO_CACHE_INITIAL_MS = 400;
const AUTO_CACHE_MAX_MS = 12000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    await sleep(ASYNC_POLL_MS);
  }
  throw new Error("Analysis timeout");
}

async function pollCachedGameAnalysis(
  gameId: string,
  signal: AbortSignal,
  moveCount?: number
): Promise<GameAnalysisData | null> {
  const started = Date.now();
  let delay = AUTO_CACHE_INITIAL_MS;
  while (Date.now() - started < AUTO_CACHE_MAX_MS) {
    if (signal.aborted) return null;
    const { data } = await gamesApi.get(gameId);
    const payload = parseAnalysisPayload(data?.analysis);
    if (payload && !isAnalysisIncomplete(payload, moveCount ?? data?.move_count)) {
      return payload;
    }
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.25), 1500);
  }
  return null;
}

export function useGameAnalysis({
  gameId,
  enabled,
  initialAnalysis = null,
  autoRun = false,
  cacheFirst = false,
  moveCount,
}: UseGameAnalysisOptions) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<GameAnalysisData | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cachePollStartedRef = useRef(false);

  const applyAnalysis = useCallback((payload: GameAnalysisData | null) => {
    if (!payload || isAnalysisIncomplete(payload, moveCount)) return;
    setAnalysis(payload);
    setError(null);
    setLoading(false);
  }, [moveCount]);

  const runAnalysis = useCallback(async () => {
    if (!gameId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      // Lancer l'async en parallèle : si le sync dépasse le délai, on a déjà un job prêt
      void gamesApi.analyzeAsync(gameId).catch(() => undefined);

      const syncPromise = gamesApi.analyze(gameId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new Error("SYNC_TIMEOUT")), SYNC_TIMEOUT_MS);
        controller.signal.addEventListener("abort", () => clearTimeout(id));
      });
      try {
        const { data } = await Promise.race([syncPromise, timeoutPromise]);
        const payload = parseAnalysisPayload(data?.analysis);
        if (payload) {
          applyAnalysis(payload);
          return;
        }
        if (data?.analysis) {
          setError(t("chess.analysis.noMoves"));
          return;
        }
        setError(t("chess.analysis.incomplete"));
      } catch {
        if (controller.signal.aborted) return;
        const payload = await pollAsyncAnalysis(gameId, controller.signal);
        if (payload) applyAnalysis(payload);
        else setError(t("chess.analysis.incomplete"));
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(formatApiError(err, t("chess.analysis.unavailable")));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [gameId, t, applyAnalysis]);

  useEffect(() => {
    if (!initialAnalysis || isAnalysisIncomplete(initialAnalysis, moveCount)) return;
    applyAnalysis(initialAnalysis);
    if (cachePollStartedRef.current) {
      abortRef.current?.abort();
      cachePollStartedRef.current = false;
    }
  }, [initialAnalysis, moveCount, applyAnalysis]);

  useEffect(() => {
    if (!enabled || !autoRun || !gameId) return;
    if (analysis && !isAnalysisIncomplete(analysis, moveCount)) return;

    if (cacheFirst) {
      const cached = initialAnalysis && !isAnalysisIncomplete(initialAnalysis, moveCount)
        ? initialAnalysis
        : null;
      if (cached) return;
      if (cachePollStartedRef.current) return;
      cachePollStartedRef.current = true;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const payload = await pollCachedGameAnalysis(gameId, controller.signal, moveCount);
          if (controller.signal.aborted) return;
          if (payload) {
            applyAnalysis(payload);
            return;
          }
          await runAnalysis();
        } catch (err: unknown) {
          if (!controller.signal.aborted) {
            setError(formatApiError(err, t("chess.analysis.unavailable")));
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
      return;
    }

    void runAnalysis();
  }, [
    enabled,
    autoRun,
    cacheFirst,
    gameId,
    initialAnalysis,
    analysis,
    moveCount,
    runAnalysis,
    applyAnalysis,
    t,
  ]);

  useEffect(() => {
    cachePollStartedRef.current = false;
  }, [gameId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { analysis, loading, error, runAnalysis, setAnalysis };
}
