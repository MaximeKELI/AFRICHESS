"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import type { PuzzleSessionRecap } from "@/lib/puzzleSession";

interface PuzzleSessionRecapModalProps {
  open: boolean;
  recap: PuzzleSessionRecap | null;
  onClose: () => void;
  onContinue?: () => void;
  onReviewPuzzle?: (puzzleId: number) => void;
  section?: number;
}

export function PuzzleSessionRecapModal({
  open,
  recap,
  onClose,
  onContinue,
  onReviewPuzzle,
  section = 1,
}: PuzzleSessionRecapModalProps) {
  const { t } = useTranslation();
  if (!open || !recap) return null;

  const topThemes = Object.entries(recap.themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-layer-modal flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true">
      <div className="glass-card max-w-md w-full p-6 space-y-4 puzzle-recap-modal">
        <h2 className="font-display text-xl font-bold text-africhess-gold">
          {t("puzzles.recap.title")}
        </h2>
        {section > 1 && (
          <p className="text-sm opacity-70">{t("puzzles.recap.sectionDone", { n: section })}</p>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="puzzle-recap-stat">
            <p className="text-2xl font-bold text-africhess-green">{recap.solved}</p>
            <p className="text-xs opacity-60">{t("puzzles.recap.solved")}</p>
          </div>
          <div className="puzzle-recap-stat">
            <p className="text-2xl font-bold">{recap.avgTimeSeconds}s</p>
            <p className="text-xs opacity-60">{t("puzzles.recap.avgTime")}</p>
          </div>
          <div className="puzzle-recap-stat">
            <p className="text-2xl font-bold text-africhess-gold">{recap.perfectStreak}</p>
            <p className="text-xs opacity-60">{t("puzzles.recap.bestStreak")}</p>
          </div>
        </div>

        {topThemes.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide opacity-50 mb-2">{t("puzzles.recap.themes")}</p>
            <div className="flex flex-wrap gap-2">
              {topThemes.map(([th, n]) => (
                <span key={th} className="px-2 py-1 rounded-full bg-white/10 text-xs">
                  {th} ×{n}
                </span>
              ))}
            </div>
          </div>
        )}

        {recap.failedPuzzles.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide opacity-50 mb-2">{t("puzzles.recap.review")}</p>
            <ul className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
              {recap.failedPuzzles.map((p) => (
                <li key={p.puzzleId} className="flex justify-between items-center text-sm">
                  <span>#{p.puzzleId} · {p.rating}</span>
                  {onReviewPuzzle && (
                    <button
                      type="button"
                      onClick={() => onReviewPuzzle(p.puzzleId)}
                      className="text-africhess-gold text-xs hover:underline"
                    >
                      {t("puzzles.recap.reviewBtn")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="w-full px-4 py-2.5 african-gradient text-white rounded-lg text-sm font-medium"
            >
              {t("puzzles.recap.continue", { n: section + 1 })}
            </button>
          )}
          <div className="flex gap-3 justify-between items-center">
            <Link href="/stats" className="text-sm text-africhess-green hover:underline">
              {t("puzzles.recap.stats")}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/20 rounded-lg text-sm font-medium hover:bg-white/5"
            >
              {t("puzzles.recap.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
