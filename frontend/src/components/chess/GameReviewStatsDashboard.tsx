"use client";

import type { AnalysisMove } from "@/lib/gameAnalysis";
import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { resolveMoveAccuracies } from "@/lib/gameAnalysis";
import {
  countForColor,
  countForSides,
} from "@/lib/moveClassificationStats";
import { useTranslation } from "@/hooks/useTranslation";
import { AccuracyCompareBar, AccuracyGauge } from "./charts/AccuracyGauge";
import { ClassificationCompareChart } from "./charts/ClassificationCompareChart";

interface GameReviewStatsDashboardProps {
  analysis: GameAnalysisData;
  moves: AnalysisMove[];
  playerIsWhite?: boolean;
  colorColumns?: boolean;
  compact?: boolean;
}

export function GameReviewStatsDashboard({
  analysis,
  moves,
  playerIsWhite,
  colorColumns = false,
  compact = false,
}: GameReviewStatsDashboardProps) {
  const { t } = useTranslation();
  const moveAcc = resolveMoveAccuracies(analysis);

  if (!moves.length) return null;

  let leftTitle: string;
  let rightTitle: string;
  let leftCounts: ReturnType<typeof countForSides>["player"];
  let rightCounts: ReturnType<typeof countForSides>["opponent"];
  let leftMoveAcc: number | null;
  let rightMoveAcc: number | null;
  let leftClassAcc: number | null;
  let rightClassAcc: number | null;

  if (colorColumns) {
    leftTitle = t("chess.analysis.whiteShort");
    rightTitle = t("chess.analysis.blackShort");
    leftCounts = countForColor(moves, true);
    rightCounts = countForColor(moves, false);
    leftMoveAcc = moveAcc.white;
    rightMoveAcc = moveAcc.black;
    leftClassAcc = analysis.accuracy_white;
    rightClassAcc = analysis.accuracy_black;
  } else if (playerIsWhite !== undefined) {
    const sides = countForSides(moves, playerIsWhite);
    leftTitle = t("chess.review.you");
    rightTitle = t("chess.review.opponent");
    leftCounts = sides.player;
    rightCounts = sides.opponent;
    leftMoveAcc = playerIsWhite ? moveAcc.white : moveAcc.black;
    rightMoveAcc = playerIsWhite ? moveAcc.black : moveAcc.white;
    leftClassAcc = playerIsWhite ? analysis.accuracy_white : analysis.accuracy_black;
    rightClassAcc = playerIsWhite ? analysis.accuracy_black : analysis.accuracy_white;
  } else {
    return null;
  }

  const totalBlunders = analysis.blunders_white + analysis.blunders_black;

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-transparent to-africhess-gold/[0.04] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-africhess-gold">
            {t("chess.review.dashboardTitle")}
          </h3>
          <p className="text-[10px] opacity-45 mt-0.5">{t("chess.review.dashboardHint")}</p>
        </div>
        {totalBlunders > 0 && (
          <span className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 border border-red-400/25 text-red-300 tabular-nums">
            {totalBlunders} {t("chess.review.blundersShort")}
          </span>
        )}
      </div>

      <div className={`p-4 ${compact ? "space-y-4" : "space-y-5"}`}>
        {/* Précision des coups */}
        <div className="rounded-xl bg-black/20 border border-white/8 p-4 space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-africhess-gold/90">
            {t("chess.review.moveAccuracyTitle")}
          </p>
          <div className="flex justify-center gap-6 sm:gap-10">
            <AccuracyGauge
              value={leftMoveAcc}
              label={leftTitle}
              highlight
              size={compact ? 84 : 100}
            />
            <AccuracyGauge
              value={rightMoveAcc}
              label={rightTitle}
              variant="muted"
              size={compact ? 84 : 100}
            />
          </div>
          <AccuracyCompareBar
            left={leftMoveAcc}
            right={rightMoveAcc}
            leftLabel={leftTitle}
            rightLabel={rightTitle}
          />
        </div>

        <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
          {/* Précision par classement */}
          <div className="rounded-xl bg-black/20 border border-white/8 p-4 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wider opacity-50">
              {t("chess.review.classificationAccuracyTitle")}
            </p>
            <div className="flex justify-center gap-6">
              <AccuracyGauge
                value={leftClassAcc}
                label={leftTitle}
                highlight
                variant="muted"
                size={compact ? 72 : 84}
              />
              <AccuracyGauge
                value={rightClassAcc}
                label={rightTitle}
                variant="muted"
                size={compact ? 72 : 84}
              />
            </div>
          </div>

          {/* Graphique comparatif des coups */}
          <div className="rounded-xl bg-black/20 border border-white/8 p-4">
            <ClassificationCompareChart
              leftTitle={leftTitle}
              rightTitle={rightTitle}
              leftCounts={leftCounts}
              rightCounts={rightCounts}
              compact={compact}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
