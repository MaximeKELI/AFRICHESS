"use client";

import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { resolveMoveAccuracies } from "@/lib/gameAnalysis";
import {
  formatClassificationAccuracy,
  formatMoveAccuracy,
} from "@/lib/moveAccuracy";
import { useTranslation } from "@/hooks/useTranslation";

interface AccuracySummaryProps {
  analysis: GameAnalysisData;
  playerIsWhite?: boolean;
  compact?: boolean;
}

export function AccuracySummary({ analysis, playerIsWhite, compact = false }: AccuracySummaryProps) {
  const { t } = useTranslation();
  const moveAcc = resolveMoveAccuracies(analysis);
  const userMoveAcc =
    playerIsWhite !== undefined
      ? playerIsWhite
        ? moveAcc.white
        : moveAcc.black
      : null;
  const userClassAcc =
    playerIsWhite !== undefined
      ? playerIsWhite
        ? analysis.accuracy_white
        : analysis.accuracy_black
      : null;

  const titleClass = compact ? "text-[10px]" : "text-xs";
  const moveValueClass = compact ? "text-xl" : "text-2xl";
  const classValueClass = compact ? "text-base" : "text-lg";

  return (
    <div className="space-y-3">
      <div>
        <p className={`${titleClass} font-semibold text-africhess-gold mb-2`}>
          {t("chess.review.moveAccuracyTitle")}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {playerIsWhite !== undefined && (
            <div className="rounded-xl bg-white/5 p-2">
              <p className="text-[10px] uppercase opacity-50">{t("chess.review.you")}</p>
              <p className={`${moveValueClass} font-bold text-africhess-gold`}>
                {formatMoveAccuracy(userMoveAcc)}
              </p>
            </div>
          )}
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] uppercase opacity-50">{t("chess.analysis.whiteShort")}</p>
            <p className={`${playerIsWhite !== undefined ? "text-lg" : moveValueClass} font-semibold`}>
              {formatMoveAccuracy(moveAcc.white)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] uppercase opacity-50">{t("chess.analysis.blackShort")}</p>
            <p className={`${playerIsWhite !== undefined ? "text-lg" : moveValueClass} font-semibold`}>
              {formatMoveAccuracy(moveAcc.black)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className={`${titleClass} font-medium opacity-60 mb-2`}>
          {t("chess.review.classificationAccuracyTitle")}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {playerIsWhite !== undefined && (
            <div className="rounded-xl bg-white/5 p-2 border border-white/5">
              <p className="text-[10px] uppercase opacity-40">{t("chess.review.you")}</p>
              <p className={`${classValueClass} font-semibold opacity-90`}>
                {formatClassificationAccuracy(userClassAcc)}
              </p>
            </div>
          )}
          <div className="rounded-xl bg-white/5 p-2 border border-white/5">
            <p className="text-[10px] uppercase opacity-40">{t("chess.analysis.whiteShort")}</p>
            <p className={`${classValueClass} font-medium opacity-90`}>
              {formatClassificationAccuracy(analysis.accuracy_white)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-2 border border-white/5">
            <p className="text-[10px] uppercase opacity-40">{t("chess.analysis.blackShort")}</p>
            <p className={`${classValueClass} font-medium opacity-90`}>
              {formatClassificationAccuracy(analysis.accuracy_black)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
