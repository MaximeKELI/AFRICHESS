"use client";

import clsx from "clsx";
import type { AnalysisMove } from "@/lib/gameAnalysis";
import { moveClassSymbol } from "@/lib/coachReview";
import {
  countForColor,
  countForSides,
  MOVE_CLASS_ORDER,
  type ClassificationCounts,
} from "@/lib/moveClassificationStats";
import { useTranslation } from "@/hooks/useTranslation";

const CLASS_BADGE: Record<string, string> = {
  brilliant: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  great: "bg-sky-500/20 text-sky-200 border-sky-400/40",
  best: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  good: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  inaccuracy: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
  mistake: "bg-orange-500/20 text-orange-200 border-orange-400/40",
  blunder: "bg-red-500/20 text-red-200 border-red-400/40",
};

interface MoveClassificationSummaryProps {
  moves: AnalysisMove[];
  /** Colonnes Vous / Adversaire */
  playerIsWhite?: boolean;
  /** Colonnes Blancs / Noirs */
  colorColumns?: boolean;
  compact?: boolean;
}

function StatsColumn({
  title,
  counts,
  compact,
  labelForClass,
}: {
  title: string;
  counts: ClassificationCounts;
  compact?: boolean;
  labelForClass: (key: string) => string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 min-w-0">
      <p className="text-[10px] uppercase tracking-wide opacity-50 mb-2 truncate">{title}</p>
      <ul className={clsx("space-y-1", compact ? "text-xs" : "text-sm")}>
        {MOVE_CLASS_ORDER.map((key) => (
          <li key={key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={clsx(
                  "inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                  CLASS_BADGE[key]
                )}
                aria-hidden
              >
                {moveClassSymbol(key)}
              </span>
              <span className="truncate opacity-90">{labelForClass(key)}</span>
            </span>
            <span
              className={clsx(
                "font-mono font-semibold tabular-nums shrink-0",
                counts[key] > 0 ? "text-white" : "opacity-30"
              )}
            >
              {counts[key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MoveClassificationSummary({
  moves,
  playerIsWhite,
  colorColumns = false,
  compact = false,
}: MoveClassificationSummaryProps) {
  const { t } = useTranslation();

  const labelForClass = (key: string) => {
    const k = `chess.review.class.${key}`;
    const label = t(k);
    return label !== k ? label : key;
  };

  if (!moves.length) return null;

  let leftTitle: string;
  let rightTitle: string;
  let leftCounts: ClassificationCounts;
  let rightCounts: ClassificationCounts;

  if (colorColumns) {
    leftTitle = t("chess.analysis.white");
    rightTitle = t("chess.analysis.black");
    leftCounts = countForColor(moves, true);
    rightCounts = countForColor(moves, false);
  } else if (playerIsWhite !== undefined) {
    const sides = countForSides(moves, playerIsWhite);
    leftTitle = t("chess.review.you");
    rightTitle = t("chess.review.opponent");
    leftCounts = sides.player;
    rightCounts = sides.opponent;
  } else {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-africhess-gold">{t("chess.review.statsTitle")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatsColumn
          title={leftTitle}
          counts={leftCounts}
          compact={compact}
          labelForClass={labelForClass}
        />
        <StatsColumn
          title={rightTitle}
          counts={rightCounts}
          compact={compact}
          labelForClass={labelForClass}
        />
      </div>
    </div>
  );
}
