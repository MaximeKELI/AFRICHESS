"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { CapturedBoardStack } from "@/components/chess/CapturedBoardStack";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { EvalGraph } from "@/components/chess/EvalGraph";
import { GameReviewStatsDashboard } from "@/components/chess/GameReviewStatsDashboard";
import { DeepReviewPanel } from "@/components/chess/DeepReviewPanel";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import {
  initAiSpeech,
  isAiSpeechSupported,
  speakComment,
  stopAiSpeech,
  testAiSpeech,
  unlockAiSpeech,
  waitForSpeechIdle,
} from "@/lib/aiSpeech";
import { buildGameDisplayFromUciList } from "@/lib/chessDisplay";
import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { coachUserMoveComment, cpLossLabel, formatEvalDisplay, moveClassSymbol } from "@/lib/coachReview";
import { evalToWinPercent, formatWinPercent } from "@/lib/evalWinProb";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { inferMovePhase, phaseLabelKey } from "@/lib/reviewPhases";
import {
  firstUserMistakeIndex,
  reviewBoardState,
  REVIEW_START_FEN,
} from "@/lib/reviewDisplay";
import { planReviewVoiceAutoStart } from "@/lib/reviewVoiceTour";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";
import {
  analysisLimitHint,
  fetchSubscriptionPlans,
  getAnalysisLimits,
  type SubscriptionPlansPayload,
} from "@/lib/subscriptionPlans";

const CLASS_COLORS: Record<string, string> = {
  brilliant: "text-cyan-300",
  great: "text-sky-300",
  best: "text-africhess-green",
  book: "text-violet-300",
  good: "text-emerald-400",
  inaccuracy: "text-yellow-400",
  mistake: "text-orange-400",
  blunder: "text-africhess-terracotta",
};

const CLASS_BADGE: Record<string, string> = {
  brilliant: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  great: "bg-sky-500/20 text-sky-200 border-sky-400/40",
  best: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  book: "bg-violet-500/20 text-violet-200 border-violet-400/40",
  good: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  inaccuracy: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
  mistake: "bg-orange-500/20 text-orange-200 border-orange-400/40",
  blunder: "bg-red-500/20 text-red-200 border-red-400/40",
};

interface GameReviewProps {
  gameId: string;
  playerIsWhite: boolean;
  orientation: "white" | "black";
  initialAnalysis?: GameAnalysisData | null;
  result?: string;
  moveCount?: number;
  onClose: () => void;
  layout?: "modal" | "page";
  cacheFirst?: boolean;
  /** Analyse statique (PGN import) — pas d'appel API */
  staticMode?: boolean;
  openingLabel?: string;
}

const MOVE_FILTERS = ["all", "brilliant", "great", "best", "book", "good", "inaccuracy", "mistake", "blunder"] as const;

export function GameReview({
  gameId,
  playerIsWhite,
  orientation,
  initialAnalysis = null,
  result,
  moveCount,
  onClose,
  layout = "modal",
  cacheFirst = false,
  staticMode = false,
  openingLabel,
}: GameReviewProps) {
  const { t, locale } = useTranslation();
  const { user } = useAuthStore();
  const { analysis, loading, error, runAnalysis } = useGameAnalysis({
    gameId,
    enabled: !staticMode && Boolean(gameId),
    initialAnalysis,
    autoRun: !staticMode,
    cacheFirst,
    moveCount,
  });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [userMovesOnly, setUserMovesOnly] = useState(false);
  const [autoTour, setAutoTour] = useState(false);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [retryIdx, setRetryIdx] = useState<number | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);
  const [openingName, setOpeningName] = useState<string | null>(openingLabel ?? null);
  const [asyncRunning, setAsyncRunning] = useState(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const autoTourRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceTourRef = useRef(false);
  const analysisTourStartedRef = useRef(false);
  const [plans, setPlans] = useState<SubscriptionPlansPayload | null>(null);

  useEffect(() => {
    void fetchSubscriptionPlans().then(setPlans);
  }, []);

  const limitHint = useMemo(
    () => analysisLimitHint(t, getAnalysisLimits(plans), user),
    [t, plans, user]
  );

  const reviewSummary = useMemo(() => {
    if (!analysis) return null;
    if (locale === "fr") return analysis.summary_fr;
    return analysis.summary_en ?? analysis.summary_fr;
  }, [analysis, locale]);

  useEffect(() => {
    initAiSpeech();
  }, []);

  useEffect(() => {
    return () => {
      stopAiSpeech();
      if (autoTourRef.current) clearInterval(autoTourRef.current);
    };
  }, []);

  useEffect(() => {
    if (analysis?.best_moves_json.length) {
      setSelectedIdx(0);
    }
  }, [analysis]);

  useEffect(() => {
    // Revue page (profil / lien direct) : l'utilisateur lance manuellement.
    // Modal post-partie : démarrage auto résumé + parcours vocal.
    if (layout !== "modal") return;

    const moveCount = analysis?.best_moves_json.length ?? 0;
    const plan = planReviewVoiceAutoStart({
      moveCount,
      alreadyStarted: analysisTourStartedRef.current,
      hasSummary: Boolean(reviewSummary?.trim()),
    });
    if (!plan) return;

    let cancelled = false;

    void (async () => {
      unlockAiSpeech();
      setVoiceOn(plan.enableVoice);
      if (plan.speakSummaryFirst && reviewSummary?.trim()) {
        await speakComment(reviewSummary.trim(), {
          byAi: false,
          enabled: true,
          forceUnlock: true,
          interrupt: true,
        });
        await waitForSpeechIdle();
      }
      if (cancelled) return;
      analysisTourStartedRef.current = true;
      setSelectedIdx(0);
      if (plan.enableAutoTour) setAutoTour(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [analysis, reviewSummary, layout]);

  const moves = analysis?.best_moves_json ?? [];
  const selectedMove = moves[selectedIdx] ?? null;

  const filteredMoves = useMemo(() => {
    if (classFilter === "all") return moves.map((m, i) => ({ move: m, index: i }));
    return moves
      .map((m, i) => ({ move: m, index: i }))
      .filter(({ move }) => move.class === classFilter);
  }, [moves, classFilter]);

  useEffect(() => {
    if (staticMode || !analysis?.best_moves_json.length) return;
    const sans = analysis.best_moves_json.map((m) => m.san);
    gamesApi
      .openingLookup(sans, locale)
      .then(({ data }) => {
        const name = (data as { name?: string }).name;
        if (name) setOpeningName(name);
      })
      .catch(() => {});
  }, [analysis, locale, staticMode]);

  const runDeepAnalysis = async () => {
    if (!gameId || staticMode) return;
    setAsyncRunning(true);
    setAsyncError(null);
    try {
      await gamesApi.analyzeAsync(gameId);
      const started = Date.now();
      while (Date.now() - started < 120000) {
        const { data } = await gamesApi.analyzeStatus(gameId);
        if (data.status === "completed" && data.analysis) {
          await runAnalysis();
          break;
        }
        if (data.status === "failed") {
          setAsyncError(typeof data.error === "string" ? data.error : t("chess.analysis.unavailable"));
          break;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    } catch (err) {
      setAsyncError(formatApiError(err, t("chess.analysis.unavailable")));
    } finally {
      setAsyncRunning(false);
    }
  };

  const winPercent = useMemo(() => {
    if (!selectedMove) return null;
    const ev = selectedMove.eval_before ?? selectedMove.eval;
    return evalToWinPercent(ev, playerIsWhite);
  }, [selectedMove, playerIsWhite]);

  const boardState = useMemo(() => {
    if (retryIdx != null && moves[retryIdx]) {
      const uciBefore = moves
        .slice(0, retryIdx)
        .map((m) => m.uci)
        .filter((u): u is string => Boolean(u));
      const fenBefore = buildGameDisplayFromUciList(REVIEW_START_FEN, uciBefore).fen;
      const mistake = moves[retryIdx];
      const best = mistake.best_uci
        ? { from: mistake.best_uci.slice(0, 2), to: mistake.best_uci.slice(2, 4) }
        : undefined;
      return {
        fen: fenBefore,
        lastMove: null,
        reviewHighlight: best ? { best } : null,
        moveClassBadge: null,
        interactive: true,
      };
    }
    return { ...reviewBoardState(moves, selectedIdx, playerIsWhite), interactive: false };
  }, [moves, selectedIdx, playerIsWhite, retryIdx]);

  const reviewCaptured = useMemo(() => {
    if (selectedIdx == null || selectedIdx < 0 || !moves.length) {
      return buildGameDisplayFromUciList(REVIEW_START_FEN, []).captured;
    }
    const ucis = moves
      .slice(0, selectedIdx + 1)
      .map((m) => m.uci)
      .filter((u): u is string => Boolean(u));
    return buildGameDisplayFromUciList(REVIEW_START_FEN, ucis).captured;
  }, [moves, selectedIdx]);

  const coachText = useMemo(() => {
    if (!selectedMove) return null;
    return coachUserMoveComment(t, selectedMove, playerIsWhite);
  }, [selectedMove, playerIsWhite, t]);

  const speakText = useCallback(
    (text: string, force = false) => {
      if (!text.trim()) return;
      unlockAiSpeech();
      speakComment(text, { byAi: false, enabled: voiceOn, forceUnlock: force });
    },
    [voiceOn]
  );

  const speakCurrent = useCallback(
    (force = false) => {
      if (!coachText || !voiceOn) return;
      const isUser = selectedMove?.played_by_white === playerIsWhite;
      if (userMovesOnly && !isUser) return;
      speakText(coachText, force);
    },
    [coachText, voiceOn, selectedMove, playerIsWhite, userMovesOnly, speakText]
  );

  const handleListen = () => speakCurrent(true);

  const handleListenSummary = () => {
    if (!reviewSummary) return;
    unlockAiSpeech();
    speakComment(reviewSummary, { byAi: false, enabled: voiceOn, forceUnlock: true });
  };

  const handleTestVoice = () => {
    unlockAiSpeech();
    void testAiSpeech(t("chess.review.voiceTest"));
  };

  useEffect(() => {
    if (!autoTour || !analysis) return;

    if (voiceOn) {
      voiceTourRef.current = true;
      let cancelled = false;

      (async () => {
        await new Promise((r) => setTimeout(r, 350));
        while (!cancelled && voiceTourRef.current) {
          await waitForSpeechIdle();
          if (cancelled || !voiceTourRef.current) break;
          await new Promise((r) => setTimeout(r, 450));
          setSelectedIdx((i) => {
            const next = i + 1;
            if (next >= moves.length) {
              setAutoTour(false);
              voiceTourRef.current = false;
              return i;
            }
            return next;
          });
          await new Promise((r) => setTimeout(r, 120));
        }
      })();

      return () => {
        cancelled = true;
        voiceTourRef.current = false;
      };
    }

    autoTourRef.current = setInterval(() => {
      setSelectedIdx((i) => {
        const next = i + 1;
        if (next >= moves.length) {
          setAutoTour(false);
          return i;
        }
        return next;
      });
    }, 2800);
    return () => {
      if (autoTourRef.current) clearInterval(autoTourRef.current);
    };
  }, [autoTour, analysis, voiceOn, moves.length]);

  useEffect(() => {
    if (autoTour && voiceOn) speakCurrent(true);
  }, [selectedIdx, autoTour, speakCurrent, voiceOn]);

  const goPrev = () => {
    setAutoTour(false);
    setSelectedIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    setAutoTour(false);
    setSelectedIdx((i) => Math.min(moves.length - 1, i + 1));
  };
  const goMistakes = () => {
    setAutoTour(false);
    const idx = firstUserMistakeIndex(moves, playerIsWhite);
    if (idx != null) {
      setSelectedIdx(idx);
      setRetryIdx(idx);
      setRetryFeedback(null);
    }
  };

  const handleRetryMove = useCallback(
    (uci: string) => {
      if (retryIdx == null) return;
      const mistake = moves[retryIdx];
      const expected = mistake.best_uci?.slice(0, 4) ?? "";
      const played = uci.slice(0, 4);
      if (played === expected) {
        setRetryFeedback(t("chess.review.retryCorrect"));
        setTimeout(() => {
          const next = moves.findIndex(
            (m, i) =>
              i > retryIdx &&
              m.played_by_white === playerIsWhite &&
              ["inaccuracy", "mistake", "blunder"].includes(m.class)
          );
          if (next >= 0) {
            setRetryIdx(next);
            setSelectedIdx(next);
            setRetryFeedback(null);
          } else {
            setRetryIdx(null);
            setRetryFeedback(null);
          }
        }, 900);
      } else {
        setRetryFeedback(
          t("chess.review.retryWrong", { move: mistake.best_san ?? expected })
        );
      }
    },
    [retryIdx, moves, playerIsWhite, t]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setAutoTour(false);
        setSelectedIdx((i) => Math.max(0, i - 1));
      }
      if (e.key === "ArrowRight") {
        setAutoTour(false);
        setSelectedIdx((i) => Math.min(moves.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moves.length]);

  const shell = (
    <div
      className={clsx(
        layout === "modal"
          ? "glass-card w-full sm:max-w-4xl max-h-[96dvh] sm:max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl"
          : "glass-card w-full max-w-5xl mx-auto rounded-2xl border border-white/10 shadow-xl my-6"
      )}
    >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[var(--card)]/95 backdrop-blur px-4 py-3">
          <div>
            <h2 id="game-review-title" className="font-display font-bold text-lg">
              {t("chess.review.title")}
            </h2>
            {result && (
              <p className="text-xs opacity-60 capitalize">{result.replace("_", " ")}</p>
            )}
            {openingName && (
              <p className="text-xs text-africhess-gold/80">{openingName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {layout === "page" ? (
              <Link
                href="/profile"
                className="text-xs px-2.5 py-1 rounded-lg border border-white/20 opacity-80 hover:opacity-100"
              >
                {t("chess.review.backProfile")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-2.5 py-1 rounded-lg border border-white/20 opacity-80 hover:opacity-100"
              >
                {t("chess.review.close")}
              </button>
            )}
            {isAiSpeechSupported() && analysis && (
              <>
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="text-xs px-2.5 py-1 rounded-lg border border-africhess-gold/50 text-africhess-gold"
                >
                  🔊 {t("comments.voice.test")}
                </button>
                <button
                  type="button"
                  onClick={() => setUserMovesOnly((v) => !v)}
                  className={clsx(
                    "text-xs px-2.5 py-1 rounded-lg border",
                    userMovesOnly
                      ? "border-africhess-green/50 text-africhess-green"
                      : "border-white/20 opacity-60"
                  )}
                >
                  {userMovesOnly ? t("chess.review.userOnly") : t("chess.review.allMoves")}
                </button>
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
              </>
            )}
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
              {limitHint && (
                <p className="text-[10px] opacity-50 text-center">
                  {limitHint}{" "}
                  <Link href="/premium" className="text-africhess-gold hover:underline">
                    {t("premium.title")}
                  </Link>
                </p>
              )}

              <GameReviewStatsDashboard
                analysis={analysis}
                moves={moves}
                playerIsWhite={playerIsWhite}
              />

              <DeepReviewPanel deep={analysis.deep_review_json} />

              {reviewSummary && (
                <div className="rounded-xl bg-gradient-to-br from-africhess-gold/10 to-transparent border border-africhess-gold/20 p-4 text-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-africhess-gold">
                      {t("chess.analysis.reviewTitle")}
                    </p>
                    {isAiSpeechSupported() && (
                      <button
                        type="button"
                        onClick={handleListenSummary}
                        className="text-xs px-2 py-1 rounded border border-africhess-gold/40 text-africhess-gold shrink-0"
                      >
                        🔊 {t("chess.review.listenSummary")}
                      </button>
                    )}
                  </div>
                  <p className="opacity-90">{reviewSummary}</p>
                  {analysis.key_moments_json && analysis.key_moments_json.length > 0 && (
                    <ul className="space-y-1 text-xs opacity-85 border-t border-white/10 pt-2">
                      {analysis.key_moments_json.map((m) => (
                        <li key={m.ply}>
                          <button
                            type="button"
                            className="text-left hover:text-africhess-gold"
                            onClick={() => {
                              setAutoTour(false);
                              setSelectedIdx(Math.max(0, m.ply - 1));
                            }}
                          >
                            • {locale === "fr" ? m.text : m.text_en ?? m.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <EvalGraph
                points={analysis.best_moves_json}
                selectedIndex={selectedIdx}
                onSelect={setSelectedIdx}
              />

              {!staticMode && user?.is_premium && (
                <button
                  type="button"
                  onClick={() => void runDeepAnalysis()}
                  disabled={asyncRunning || loading}
                  className="w-full py-2 text-sm rounded-xl african-gradient text-white disabled:opacity-40"
                >
                  {asyncRunning ? t("chess.analysis.cloudRunning") : t("chess.analysis.cloudRun")}
                </button>
              )}
              {asyncError && (
                <p className="text-xs text-africhess-terracotta text-center">{asyncError}</p>
              )}

              <div className="max-w-[min(100%,820px)] mx-auto">
                <CapturedBoardStack captured={reviewCaptured} orientation={orientation}>
                  <ChessBoard
                    fen={boardState.fen}
                    orientation={orientation}
                    disabled={!boardState.interactive}
                    onMove={boardState.interactive ? handleRetryMove : undefined}
                    lastMove={boardState.lastMove}
                    playSoundOnFenChange={false}
                    reviewHighlight={boardState.reviewHighlight}
                    moveClassBadge={boardState.moveClassBadge}
                  />
                </CapturedBoardStack>
              </div>

              {retryIdx != null && (
                <div className="rounded-xl border border-africhess-gold/30 bg-africhess-gold/5 p-3 text-sm space-y-1">
                  <p className="font-medium">{t("chess.analysis.retryHint")}</p>
                  <p className="text-xs opacity-70">{t("chess.review.playBestMove")}</p>
                  {retryFeedback && (
                    <p className="text-africhess-gold">{retryFeedback}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setRetryIdx(null)}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    {t("common.close")}
                  </button>
                </div>
              )}

              {selectedMove && (
                <div className="rounded-xl border border-africhess-green/25 bg-gradient-to-br from-africhess-green/8 to-transparent p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide opacity-50">
                      {selectedMove.played_by_white === playerIsWhite
                        ? t("chess.review.yourMove")
                        : t("chess.review.opponentMove")}
                    </span>
                    <span className="font-mono text-lg text-africhess-gold">{selectedMove.san}</span>
                    <span
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded-full border font-bold",
                        CLASS_BADGE[selectedMove.class] ?? "border-white/20"
                      )}
                      title={selectedMove.class}
                    >
                      {moveClassSymbol(selectedMove.class)}
                    </span>
                    {cpLossLabel(selectedMove.cp_loss) && (
                      <span className="text-xs font-mono text-africhess-terracotta">
                        {cpLossLabel(selectedMove.cp_loss)} {t("chess.review.pawns")}
                      </span>
                    )}
                    {selectedMove.eval != null && (
                      <span className="text-xs font-mono opacity-60 ml-auto">
                        {formatEvalDisplay(selectedMove.eval)}
                      </span>
                    )}
                    {winPercent != null && (
                      <span className="text-xs opacity-50">
                        {t("chess.review.winChance")}: {formatWinPercent(winPercent)}%
                      </span>
                    )}
                    {selectedMove.phase && (
                      <span className="text-[10px] uppercase tracking-wide opacity-40">
                        {t(phaseLabelKey(selectedMove.phase))}
                      </span>
                    )}
                    {isAiSpeechSupported() && voiceOn && (
                      <button
                        type="button"
                        onClick={handleListen}
                        className="text-xs px-2 py-1 rounded border border-white/25 hover:border-africhess-gold"
                      >
                        🔊 {t("comments.voice.listen")}
                      </button>
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

              <button
                type="button"
                onClick={() => {
                  unlockAiSpeech();
                  if (autoTour) {
                    setAutoTour(false);
                    return;
                  }
                  setVoiceOn(true);
                  setAutoTour(true);
                  speakCurrent(true);
                }}
                className={clsx(
                  "w-full py-2 text-sm rounded-xl border",
                  autoTour
                    ? "border-africhess-green bg-africhess-green/15 text-africhess-green"
                    : "border-white/20 hover:bg-white/5"
                )}
              >
                {autoTour ? t("chess.review.stopTour") : t("chess.review.startTour")}
              </button>

              <div className="flex flex-wrap gap-1">
                {MOVE_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setClassFilter(f)}
                    className={clsx(
                      "px-2 py-0.5 rounded text-[10px] border capitalize",
                      classFilter === f
                        ? "border-africhess-gold bg-africhess-gold/15"
                        : "opacity-50 border-white/15"
                    )}
                  >
                    {f === "all" ? t("chess.analysis.filterAll") : f}
                  </button>
                ))}
              </div>

              <ul className="max-h-40 overflow-y-auto text-xs space-y-0.5 scrollbar-thin rounded-xl border border-white/8 bg-black/15 p-2">
                {filteredMoves.map(({ move: m, index: i }) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoTour(false);
                        setRetryIdx(null);
                        setSelectedIdx(i);
                      }}
                      className={clsx(
                        "w-full flex items-center gap-2 text-left rounded px-2 py-1",
                        selectedIdx === i && "bg-africhess-gold/10",
                        m.played_by_white === playerIsWhite && "font-medium"
                      )}
                    >
                      <span className="w-5 opacity-40">{i + 1}.</span>
                      <span className="font-mono text-africhess-gold">{m.san}</span>
                      <span className={clsx("font-bold w-5 text-center", CLASS_COLORS[m.class] ?? "")}>
                        {moveClassSymbol(m.class)}
                      </span>
                      <span className={clsx("capitalize opacity-70", CLASS_COLORS[m.class] ?? "")}>
                        {m.class}
                      </span>
                      <span className="text-[9px] opacity-30 ml-auto">
                        {t(phaseLabelKey(m.phase ?? inferMovePhase(i)))}
                      </span>
                      {m.played_by_white === playerIsWhite && (
                        <span className="text-[10px] opacity-40">{t("chess.review.you")}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
    </div>
  );

  if (layout === "page") {
    return (
      <div className="min-h-screen px-4" role="main" aria-labelledby="game-review-title">
        {shell}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-layer-modal flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-review-title"
    >
      {shell}
    </div>
  );
}
