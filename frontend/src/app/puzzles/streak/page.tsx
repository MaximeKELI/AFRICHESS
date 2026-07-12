"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PuzzleBoard } from "@/components/puzzles/PuzzleBoard";
import { puzzlesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface Puzzle {
  id: number;
  fen: string;
  solution_moves: string[];
  themes?: string[];
  difficulty?: string;
  rating?: number;
}

export default function PuzzleStreakPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [skipUsed, setSkipUsed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    setEnded(false);
    setScore(0);
    setSkipUsed(false);
    setPuzzle(null);
    try {
      const { data } = await puzzlesApi.streakRunStart();
      setSessionId(data.session_id);
      setPuzzle(data.puzzle);
      setBoardKey((k) => k + 1);
    } catch (err) {
      setError(formatApiError(err, t("puzzles.streakRun.error")));
    } finally {
      setBusy(false);
    }
  };

  const applyResult = useCallback((data: {
    score: number;
    completed?: boolean;
    skip_used?: boolean;
    next_puzzle?: Puzzle | null;
  }) => {
    setScore(data.score ?? 0);
    setSkipUsed(Boolean(data.skip_used));
    if (data.completed) {
      setEnded(true);
      setPuzzle(null);
      return;
    }
    if (data.next_puzzle) {
      setPuzzle(data.next_puzzle);
      setBoardKey((k) => k + 1);
    }
  }, []);

  const submitMoves = useCallback(
    async (moves: string[]) => {
      if (!sessionId || busy || ended) return;
      setBusy(true);
      try {
        const { data } = await puzzlesApi.streakRunSubmit(sessionId, {
          moves,
          time_seconds: 0,
        });
        applyResult(data);
      } catch (err) {
        setError(formatApiError(err, t("puzzles.streakRun.error")));
      } finally {
        setBusy(false);
      }
    },
    [sessionId, busy, ended, applyResult, t]
  );

  const skip = async () => {
    if (!sessionId || skipUsed || busy || ended) return;
    setBusy(true);
    try {
      const { data } = await puzzlesApi.streakRunSubmit(sessionId, { skip: true });
      applyResult(data);
    } catch (err) {
      setError(formatApiError(err, t("puzzles.streakRun.error")));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("puzzles.streakRun.login")}</p>
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("puzzles.streakRun.title")}</h1>
      <p className="text-sm opacity-70 mb-6">{t("puzzles.streakRun.subtitle")}</p>
      <p className="text-xs opacity-50 mb-4">
        {t("puzzles.dailyStreak")} → <Link href="/puzzles" className="underline">{t("nav.puzzles")}</Link>
      </p>
      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}

      {!sessionId || ended ? (
        <div className="glass-card p-6 text-center space-y-4">
          {ended && (
            <p className="font-semibold text-lg">
              {t("puzzles.streakRun.ended", { score })}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="px-6 py-2 african-gradient text-white rounded-lg"
          >
            {t("puzzles.streakRun.start")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="px-3 py-1 rounded-full bg-africhess-gold/20 text-sm">
              {t("puzzles.streakRun.score", { score })}
            </span>
            <button
              type="button"
              onClick={skip}
              disabled={skipUsed || busy || !puzzle}
              className="px-3 py-1 text-sm rounded-lg border border-white/20 disabled:opacity-40"
            >
              {t("puzzles.streakRun.skip")}
            </button>
          </div>
          {puzzle && (
            <PuzzleBoard
              key={`${puzzle.id}-${boardKey}`}
              puzzle={puzzle}
              onComplete={(moves) => void submitMoves(moves)}
              onWrong={(played) => void submitMoves(played)}
              lockOnWrong
            />
          )}
        </div>
      )}
    </div>
  );
}
