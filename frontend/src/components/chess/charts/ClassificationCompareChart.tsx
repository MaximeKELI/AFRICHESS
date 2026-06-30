"use client";

import clsx from "clsx";
import type { ClassificationCounts } from "@/lib/moveClassificationStats";
import { MOVE_CLASS_ORDER } from "@/lib/moveClassificationStats";
import { moveClassSymbol } from "@/lib/coachReview";
import { MOVE_CLASS_CHART_COLORS, MOVE_CLASS_CHART_BG } from "@/lib/moveClassVisuals";
import { useTranslation } from "@/hooks/useTranslation";

interface ClassificationCompareChartProps {
  leftTitle: string;
  rightTitle: string;
  leftCounts: ClassificationCounts;
  rightCounts: ClassificationCounts;
  compact?: boolean;
}

function maxCount(...counts: ClassificationCounts[]): number {
  let max = 1;
  for (const key of MOVE_CLASS_ORDER) {
    for (const c of counts) {
      if (c[key] > max) max = c[key];
    }
  }
  return max;
}

export function ClassificationCompareChart({
  leftTitle,
  rightTitle,
  leftCounts,
  rightCounts,
  compact = false,
}: ClassificationCompareChartProps) {
  const { t } = useTranslation();
  const scale = maxCount(leftCounts, rightCounts);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider opacity-50">
        <span className="truncate">{leftTitle}</span>
        <span className="shrink-0 opacity-60">{t("chess.review.statsTitle")}</span>
        <span className="truncate text-right">{rightTitle}</span>
      </div>

      <ul className={clsx("space-y-2", compact && "space-y-1.5")}>
        {MOVE_CLASS_ORDER.map((key) => {
          const left = leftCounts[key];
          const right = rightCounts[key];
          const hasData = left > 0 || right > 0;
          const classKey = `chess.review.class.${key}`;
          const rawLabel = t(classKey);
          const label = rawLabel !== classKey ? rawLabel : key;

          return (
            <li key={key} className={clsx(!hasData && "opacity-35")}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex w-5 h-5 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                  style={{
                    color: MOVE_CLASS_CHART_COLORS[key],
                    background: MOVE_CLASS_CHART_BG[key],
                  }}
                  aria-hidden
                >
                  {moveClassSymbol(key)}
                </span>
                <span className="text-[11px] opacity-70 truncate flex-1">{label}</span>
                <span className="text-[10px] font-mono tabular-nums opacity-50 w-4 text-right">
                  {left}
                </span>
                <span className="text-[10px] font-mono tabular-nums opacity-50 w-4 text-left">
                  {right}
                </span>
              </div>
              <div className="flex items-center gap-1.5 h-2">
                <div className="flex-1 flex justify-end h-full">
                  <div
                    className="h-full rounded-l-full transition-all duration-500"
                    style={{
                      width: `${(left / scale) * 100}%`,
                      minWidth: left > 0 ? 4 : 0,
                      background: `linear-gradient(90deg, transparent, ${MOVE_CLASS_CHART_COLORS[key]}88)`,
                    }}
                  />
                </div>
                <div className="w-px h-full bg-white/10 shrink-0" />
                <div className="flex-1 flex justify-start h-full">
                  <div
                    className="h-full rounded-r-full transition-all duration-500"
                    style={{
                      width: `${(right / scale) * 100}%`,
                      minWidth: right > 0 ? 4 : 0,
                      background: `linear-gradient(270deg, transparent, ${MOVE_CLASS_CHART_COLORS[key]}88)`,
                    }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
