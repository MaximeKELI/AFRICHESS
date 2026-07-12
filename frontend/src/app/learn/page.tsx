"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BASICS_STAGES,
  loadBasicsProgress,
  markStageComplete,
  type BasicsStage,
} from "@/lib/chessBasics/stages";
import { evaluateBasicsMove, orientationFromFen } from "@/lib/chessBasics/engine";

export default function ChessBasicsPage() {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fen, setFen] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardKey, setBoardKey] = useState(0);

  useEffect(() => {
    setCompleted(loadBasicsProgress());
  }, []);

  const stage: BasicsStage | null = useMemo(
    () => BASICS_STAGES.find((s) => s.id === activeId) ?? null,
    [activeId]
  );

  const startStage = (s: BasicsStage) => {
    setActiveId(s.id);
    setFen(s.fen);
    setFeedback(null);
    setBoardKey((k) => k + 1);
  };

  const onMove = useCallback(
    (uci: string) => {
      if (!stage) return;
      const result = evaluateBasicsMove(fen, uci, stage.goal);
      if (result.illegal) {
        setFeedback(t("learn.basics.illegal"));
        return;
      }
      setFen(result.fen);
      if (result.done) {
        setFeedback(t("learn.basics.success"));
        setCompleted(markStageComplete(stage.id));
      } else {
        setFeedback(t("learn.basics.tryAgain"));
      }
    },
    [fen, stage, t]
  );

  const reset = () => {
    if (!stage) return;
    setFen(stage.fen);
    setFeedback(null);
    setBoardKey((k) => k + 1);
  };

  const pct = Math.round((completed.length / BASICS_STAGES.length) * 100);

  if (stage) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          type="button"
          onClick={() => setActiveId(null)}
          className="text-sm text-africhess-gold hover:underline"
        >
          ← {t("learn.basics.back")}
        </button>
        <h1 className="font-display text-2xl font-bold">{t(stage.titleKey)}</h1>
        <p className="text-sm opacity-70">{t(stage.hintKey)}</p>
        <ChessBoard
          key={boardKey}
          fen={fen}
          onMove={onMove}
          orientation={orientationFromFen(stage.fen)}
        />
        {feedback && <p className="text-sm font-medium">{feedback}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm rounded-lg border border-white/20"
          >
            {t("learn.basics.reset")}
          </button>
          {completed.includes(stage.id) && (
            <button
              type="button"
              onClick={() => {
                const idx = BASICS_STAGES.findIndex((s) => s.id === stage.id);
                const next = BASICS_STAGES[idx + 1];
                if (next) startStage(next);
                else setActiveId(null);
              }}
              className="px-4 py-2 text-sm rounded-lg african-gradient text-white"
            >
              {t("learn.basics.next")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.learn")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("learn.basics.title")}</h1>
        <p className="text-sm opacity-70 mt-1">{t("learn.basics.subtitle")}</p>
        <p className="text-xs opacity-50 mt-2">
          {t("learn.basics.progress", { n: completed.length, total: BASICS_STAGES.length, pct })}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BASICS_STAGES.map((s) => {
          const done = completed.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => startStage(s)}
              className="glass-card p-4 text-left hover:border-africhess-gold/50 border border-transparent transition-colors"
            >
              <span className="font-semibold">{t(s.titleKey)}</span>
              <span className="block text-xs opacity-50 mt-1">
                {done ? t("learn.basics.done") : t("learn.basics.start")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
