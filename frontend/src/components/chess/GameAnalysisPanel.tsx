"use client";

import { useMemo, useState } from "react";
import { gamesApi } from "@/lib/api";
import { coachPhrase } from "@/lib/coachReview";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import clsx from "clsx";
import { EvalGraph } from "./EvalGraph";

interface MoveAnalysis {
  san: string;
  eval: number;
  class: string;
  cp_loss?: number;
  played_by_white?: boolean;
}

interface AnalysisData {
  accuracy_white: number | null;
  accuracy_black: number | null;
  blunders_white: number;
  blunders_black: number;
  best_moves_json: MoveAnalysis[];
}

const CLASS_COLORS: Record<string, string> = {
  best: "text-africhess-green",
  good: "text-emerald-400",
  inaccuracy: "text-yellow-400",
  mistake: "text-orange-400",
  blunder: "text-africhess-terracotta",
};

interface GameAnalysisPanelProps {
  gameId: string;
  completed: boolean;
}

export function GameAnalysisPanel({ gameId, completed }: GameAnalysisPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [retryIdx, setRetryIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.analyze(gameId);
      const payload = data?.analysis;
      if (payload?.best_moves_json?.length) {
        setAnalysis(payload);
        setSelectedIdx(0);
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

  const mistakes = useMemo(
    () =>
      analysis?.best_moves_json.filter((m) =>
        ["mistake", "blunder", "inaccuracy"].includes(m.class)
      ) ?? [],
    [analysis]
  );

  const filtered = useMemo(() => {
    if (!analysis) return [];
    if (filter === "all") return analysis.best_moves_json;
    return analysis.best_moves_json.filter((m) => m.class === filter);
  }, [analysis, filter]);

  const selectedMove =
    selectedIdx != null ? analysis?.best_moves_json[selectedIdx] : null;

  const coachText = useMemo(() => {
    if (!selectedMove) return null;
    return coachPhrase(
      t,
      selectedMove.class,
      selectedMove.cp_loss,
      selectedMove.played_by_white
    );
  }, [selectedMove, t]);

  if (!completed) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">{t("chess.analysis.title")}</h3>
      <p className="text-[10px] opacity-50">{t("chess.analysis.hint")}</p>
      {!user?.is_premium && (
        <p className="text-[10px] opacity-60">
          {t("chess.analysis.freeLimit")}{" "}
          <Link href="/premium" className="text-africhess-gold hover:underline">
            {t("premium.title")}
          </Link>
        </p>
      )}

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
        <>
          <EvalGraph
            points={analysis.best_moves_json}
            selectedIndex={selectedIdx}
            onSelect={setSelectedIdx}
          />

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-xs opacity-50">{t("chess.analysis.white")}</p>
              <p className="text-lg font-bold text-africhess-gold">
                {analysis.accuracy_white != null ? `${analysis.accuracy_white}%` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-xs opacity-50">{t("chess.analysis.black")}</p>
              <p className="text-lg font-bold text-africhess-gold">
                {analysis.accuracy_black != null ? `${analysis.accuracy_black}%` : "—"}
              </p>
            </div>
          </div>

          {coachText && (
            <div className="rounded-lg border border-africhess-green/30 bg-africhess-green/5 p-3 text-xs">
              <p className="font-semibold text-africhess-gold mb-1">
                {t("chess.analysis.coachTitle")}
              </p>
              <p className="opacity-90">{coachText}</p>
              {selectedMove && (
                <p className="mt-2 font-mono opacity-70">
                  {selectedMove.san}
                  {selectedMove.cp_loss != null && selectedMove.cp_loss > 0 && (
                    <span className="ml-2 text-africhess-terracotta">
                      −{Math.round(selectedMove.cp_loss / 100 * 10) / 10}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          <p className="text-xs opacity-70">
            {t("chess.analysis.blunders", {
              white: analysis.blunders_white,
              black: analysis.blunders_black,
            })}
          </p>

          {mistakes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const first = analysis.best_moves_json.findIndex((m) =>
                  ["mistake", "blunder", "inaccuracy"].includes(m.class)
                );
                if (first >= 0) {
                  setSelectedIdx(first);
                  setRetryIdx(first);
                }
              }}
              className="w-full py-1.5 text-xs rounded-lg border border-africhess-gold/50 text-africhess-gold hover:bg-africhess-gold/10"
            >
              {t("chess.analysis.retry", { count: mistakes.length })}
            </button>
          )}

          {retryIdx !== null && mistakes[retryIdx] && (
            <div className="rounded-lg border border-africhess-gold/30 p-3 text-xs space-y-2">
              <p className="font-medium">{t("chess.analysis.retryHint")}</p>
              <p>
                <span className="font-mono text-africhess-gold">{mistakes[retryIdx].san}</span>
                {" — "}
                <span className={CLASS_COLORS[mistakes[retryIdx].class]}>
                  {mistakes[retryIdx].class}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = analysis.best_moves_json.findIndex(
                      (m, i) =>
                        i > (retryIdx ?? -1) &&
                        ["mistake", "blunder", "inaccuracy"].includes(m.class)
                    );
                    if (idx >= 0) {
                      setRetryIdx(idx);
                      setSelectedIdx(idx);
                    } else setRetryIdx(null);
                  }}
                  className="px-2 py-1 rounded border text-[10px]"
                >
                  {t("chess.analysis.next")}
                </button>
                <button
                  type="button"
                  onClick={() => setRetryIdx(null)}
                  className="px-2 py-1 rounded border text-[10px] opacity-60"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {["all", "best", "good", "inaccuracy", "mistake", "blunder"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-2 py-0.5 rounded text-[10px] border",
                  filter === f ? "border-africhess-gold bg-africhess-gold/15" : "opacity-50"
                )}
              >
                {f === "all" ? t("chess.analysis.filterAll") : f}
              </button>
            ))}
          </div>

          <ul className="max-h-48 overflow-y-auto text-xs space-y-1">
            {filtered.map((e, i) => {
              const globalIdx = analysis.best_moves_json.indexOf(e);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSelectedIdx(globalIdx)}
                    className={clsx(
                      "w-full flex items-center gap-2 text-left rounded px-1 py-0.5",
                      selectedIdx === globalIdx && "bg-africhess-gold/10"
                    )}
                  >
                    <span className="w-4 opacity-40">{globalIdx + 1}.</span>
                    <span className="font-mono text-africhess-gold">{e.san}</span>
                    <span className={clsx("capitalize", CLASS_COLORS[e.class] ?? "")}>
                      {e.class}
                    </span>
                    {e.eval != null && (
                      <span className="opacity-50 ml-auto">{e.eval}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
