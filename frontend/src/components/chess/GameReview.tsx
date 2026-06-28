"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { CapturedBoardStack } from "@/components/chess/CapturedBoardStack";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { EvalGraph } from "@/components/chess/EvalGraph";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import {
  initAiSpeech,
  isAiSpeechSupported,
  speakComment,
  unlockAiSpeech,
} from "@/lib/aiSpeech";
import type { CapturedState } from "@/lib/chessDisplay";
import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { coachUserMoveComment, formatEvalDisplay } from "@/lib/coachReview";
import {
  firstUserMistakeIndex,
  reviewBoardState,
} from "@/lib/reviewDisplay";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

const CLASS_COLORS: Record<string, string> = {
  brilliant: "text-cyan-300",
  great: "text-sky-300",
  best: "text-africhess-green",
  good: "text-emerald-400",
  inaccuracy: "text-yellow-400",
  mistake: "text-orange-400",
  blunder: "text-africhess-terracotta",
};

const CLASS_BADGE: Record<string, string> = {
  brilliant: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  great: "bg-sky-500/20 text-sky-200 border-sky-400/40",
  best: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  good: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  inaccuracy: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
  mistake: "bg-orange-500/20 text-orange-200 border-orange-400/40",
  blunder: "bg-red-500/20 text-red-200 border-red-400/40",
};

interface GameReviewProps {
  gameId: string;
  playerIsWhite: boolean;
  orientation: "white" | "black";
  captured?: CapturedState;
  initialAnalysis?: GameAnalysisData | null;
  result?: string;
  onClose: () => void;
}

export function GameReview({
  gameId,
  playerIsWhite,
  orientation,
  captured,
  initialAnalysis = null,
  result,
  onClose,
}: GameReviewProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { analysis, loading, error, runAnalysis } = useGameAnalysis({
    gameId,
    enabled: true,
    initialAnalysis,
    autoRun: true,
  });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    initAiSpeech();
    unlockAiSpeech();
  }, []);

  useEffect(() => {
    if (analysis?.best_moves_json.length) {
      setSelectedIdx(0);
    }
  }, [analysis]);

  const moves = analysis?.best_moves_json ?? [];
  const selectedMove = moves[selectedIdx] ?? null;

  const boardState = useMemo(
    () => reviewBoardState(moves, selectedIdx, playerIsWhite),
    [moves, selectedIdx, playerIsWhite]
  );

  const reviewCaptured = useMemo(() => {
    if (!captured || selectedIdx == null || selectedIdx < 0) return captured;
    return captured;
  }, [captured, selectedIdx]);

  const coachText = useMemo(() => {
    if (!selectedMove) return null;
    return coachUserMoveComment(t, selectedMove, playerIsWhite);
  }, [selectedMove, playerIsWhite, t]);

  const speakCurrent = useCallback(() => {
    if (!coachText || !voiceOn) return;
    const isUser =
      selectedMove?.played_by_white === playerIsWhite;
    if (!isUser && !["blunder", "mistake", "brilliant", "great"].includes(selectedMove?.class ?? "")) {
      return;
    }
    speakComment(coachText, { byAi: false, enabled: true });
  }, [coachText, voiceOn, selectedMove, playerIsWhite]);

  useEffect(() => {
    speakCurrent();
  }, [selectedIdx, speakCurrent]);

  const userAccuracy = playerIsWhite
    ? analysis?.accuracy_white
    : analysis?.accuracy_black;

  const goPrev = () => setSelectedIdx((i) => Math.max(0, i - 1));
  const goNext = () => setSelectedIdx((i) => Math.min(moves.length - 1, i + 1));
  const goMistakes = () => {
    const idx = firstUserMistakeIndex(moves, playerIsWhite);
    if (idx != null) setSelectedIdx(idx);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-review-title"
    >
      <div className="glass-card w-full sm:max-w-4xl max-h-[96dvh] sm:max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[var(--card)]/95 backdrop-blur px-4 py-3">
          <div>
            <h2 id="game-review-title" className="font-display font-bold text-lg">
              {t("chess.review.title")}
            </h2>
            {result && (
              <p className="text-xs opacity-60 capitalize">{result.replace("_", " ")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAiSpeechSupported() && analysis && (
              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                className={clsx(
                  "text-xs px-2.5 py-1 rounded-lg border",
                  voiceOn
                    ? "border-africhess-gold text-africhess-gold"
                    : "border-white/20 opacity-60"
                )}
              >
                {voiceOn ? t("chess.analysis.voiceOff") : t("chess.analysis.voiceOn")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/20 opacity-80 hover:opacity-100"
            >
              {t("chess.review.close")}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading && !analysis && (
            <div className="text-center py-8 space-y-2">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-africhess-gold border-t-transparent" />
              <p className="text-sm text-africhess-gold">{t("chess.review.analyzing")}</p>
            </div>
          )}

          {!loading && !analysis && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm opacity-70">{t("chess.analysis.hint")}</p>
              <button
                type="button"
                onClick={() => void runAnalysis()}
                className="px-6 py-2.5 rounded-xl african-gradient text-white text-sm font-semibold"
              >
                {t("chess.review.start")}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-africhess-terracotta text-center">{error}</p>}

          {analysis && (
            <>
              {!user?.is_diamond && (
                <p className="text-[10px] opacity-50 text-center">
                  {user?.is_premium ? t("chess.analysis.goldLimit") : t("chess.analysis.freeLimit")}{" "}
                  <Link href="/premium" className="text-africhess-gold hover:underline">
                    {t("premium.title")}
                  </Link>
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/5 p-2">
                  <p className="text-[10px] uppercase opacity-50">{t("chess.review.yourAccuracy")}</p>
                  <p className="text-2xl font-bold text-africhess-gold">
                    {userAccuracy != null ? `${userAccuracy}%` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-2">
                  <p className="text-[10px] uppercase opacity-50">{t("chess.analysis.white")}</p>
                  <p className="text-lg font-semibold">
                    {analysis.accuracy_white != null ? `${analysis.accuracy_white}%` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-2">
                  <p className="text-[10px] uppercase opacity-50">{t("chess.analysis.black")}</p>
                  <p className="text-lg font-semibold">
                    {analysis.accuracy_black != null ? `${analysis.accuracy_black}%` : "—"}
                  </p>
                </div>
              </div>

              {analysis.summary_fr && (
                <div className="rounded-xl bg-africhess-gold/10 border border-africhess-gold/20 p-3 text-sm">
                  <p className="font-semibold text-africhess-gold mb-1">
                    {t("chess.analysis.reviewTitle")}
                  </p>
                  <p className="opacity-90">{analysis.summary_fr}</p>
                </div>
              )}

              <EvalGraph
                points={analysis.best_moves_json}
                selectedIndex={selectedIdx}
                onSelect={setSelectedIdx}
              />

              <div className="max-w-[min(100%,820px)] mx-auto">
                <CapturedBoardStack captured={reviewCaptured} orientation={orientation}>
                  <ChessBoard
                    fen={boardState.fen}
                    orientation={orientation}
                    disabled
                    lastMove={boardState.lastMove}
                    playSoundOnFenChange={false}
                    reviewHighlight={boardState.reviewHighlight}
                  />
                </CapturedBoardStack>
              </div>

              {selectedMove && (
                <div className="rounded-xl border border-africhess-green/30 bg-africhess-green/5 p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide opacity-50">
                      {selectedMove.played_by_white === playerIsWhite
                        ? t("chess.review.yourMove")
                        : t("chess.review.opponentMove")}
                    </span>
                    <span className="font-mono text-lg text-africhess-gold">{selectedMove.san}</span>
                    <span
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded-full border capitalize",
                        CLASS_BADGE[selectedMove.class] ?? "border-white/20"
                      )}
                    >
                      {selectedMove.class}
                    </span>
                    {selectedMove.eval != null && (
                      <span className="text-xs font-mono opacity-60 ml-auto">
                        {formatEvalDisplay(selectedMove.eval)}
                      </span>
                    )}
                  </div>
                  {coachText && (
                    <p className="text-sm leading-relaxed opacity-95">{coachText}</p>
                  )}
                  {selectedMove.best_san &&
                    selectedMove.class !== "best" &&
                    selectedMove.class !== "brilliant" &&
                    selectedMove.class !== "great" &&
                    selectedMove.best_san !== selectedMove.san && (
                      <p className="text-sm text-africhess-gold">
                        {t("chess.analysis.bestMove")}:{" "}
                        <span className="font-mono font-semibold">{selectedMove.best_san}</span>
                      </p>
                    )}
                  {selectedMove.pv_san && (
                    <p className="text-xs opacity-60">
                      {t("chess.analysis.engineLine")}: {selectedMove.pv_san}
                    </p>
                  )}
                  {boardState.reviewHighlight?.best && (
                    <p className="text-[11px] opacity-50">
                      {t("chess.review.legend")}{" "}
                      <span className="text-emerald-400">{t("chess.review.legendBest")}</span>
                      {" · "}
                      <span className="text-red-400">{t("chess.review.legendPlayed")}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIdx(0)}
                  disabled={selectedIdx <= 0}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/20 disabled:opacity-40"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={selectedIdx <= 0}
                  className="px-4 py-1.5 text-xs rounded-lg border border-white/20 disabled:opacity-40"
                >
                  {t("chess.review.prev")}
                </button>
                <span className="text-xs font-mono opacity-60 min-w-[5rem] text-center">
                  {t("chess.review.moveOf", {
                    current: selectedIdx + 1,
                    total: moves.length,
                  })}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={selectedIdx >= moves.length - 1}
                  className="px-4 py-1.5 text-xs rounded-lg border border-white/20 disabled:opacity-40"
                >
                  {t("chess.review.next")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIdx(moves.length - 1)}
                  disabled={selectedIdx >= moves.length - 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/20 disabled:opacity-40"
                >
                  ⏭
                </button>
              </div>

              {firstUserMistakeIndex(moves, playerIsWhite) != null && (
                <button
                  type="button"
                  onClick={goMistakes}
                  className="w-full py-2 text-sm rounded-xl border border-africhess-gold/50 text-africhess-gold hover:bg-africhess-gold/10"
                >
                  {t("chess.review.myMistakes")}
                </button>
              )}

              <ul className="max-h-36 overflow-y-auto text-xs space-y-0.5 scrollbar-thin border-t border-white/10 pt-2">
                {moves.map((m, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(i)}
                      className={clsx(
                        "w-full flex items-center gap-2 text-left rounded px-2 py-1",
                        selectedIdx === i && "bg-africhess-gold/10",
                        m.played_by_white === playerIsWhite && "font-medium"
                      )}
                    >
                      <span className="w-5 opacity-40">{i + 1}.</span>
                      <span className="font-mono text-africhess-gold">{m.san}</span>
                      <span className={clsx("capitalize", CLASS_COLORS[m.class] ?? "")}>
                        {m.class}
                      </span>
                      {m.played_by_white === playerIsWhite && (
                        <span className="text-[10px] opacity-40 ml-1">{t("chess.review.you")}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
