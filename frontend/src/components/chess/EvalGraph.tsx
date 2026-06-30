"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { MOVE_CLASS_CHART_COLORS } from "@/lib/moveClassVisuals";
import { useTranslation } from "@/hooks/useTranslation";

interface EvalPoint {
  eval: number;
  class?: string;
  san?: string;
}

interface EvalGraphProps {
  points: EvalPoint[];
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  height?: number;
  /** Affiche le conteneur carte avec titre */
  framed?: boolean;
}

function clampEval(cp: number): number {
  return Math.max(-800, Math.min(800, cp));
}

function pointColor(moveClass?: string): string {
  if (!moveClass) return "#34d399";
  return MOVE_CLASS_CHART_COLORS[moveClass] ?? "#34d399";
}

export function EvalGraph({
  points,
  selectedIndex = null,
  onSelect,
  height = 140,
  framed = true,
}: EvalGraphProps) {
  const { t } = useTranslation();
  const width = 400;
  const padX = 12;
  const padY = 14;

  const coords = useMemo(() => {
    if (!points.length) return [];
    const maxX = Math.max(points.length - 1, 1);
    return points.map((p, i) => {
      const evalCp = typeof p.eval === "number" ? p.eval * 100 : 0;
      const yNorm = 0.5 - clampEval(evalCp) / 1600;
      return {
        x: padX + (i / maxX) * (width - padX * 2),
        y: padY + yNorm * (height - padY * 2),
        ...p,
        index: i,
      };
    });
  }, [points, height]);

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x},${height - padY} L${coords[0].x},${height - padY} Z`
      : "";
  const zeroY = padY + 0.5 * (height - padY * 2);

  const chart = !points.length ? (
    <p className="text-xs opacity-50 text-center py-8">{t("chess.analysis.graphEmpty")}</p>
  ) : (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={t("chess.analysis.graphLabel")}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="eval-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A017" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#D4A017" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="eval-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>

        {/* Zones blancs / noirs */}
        <rect
          x={padX}
          y={padY}
          width={width - padX * 2}
          height={(height - padY * 2) / 2}
          fill="rgba(255,255,255,0.02)"
          rx={4}
        />
        <rect
          x={padX}
          y={zeroY}
          width={width - padX * 2}
          height={(height - padY * 2) / 2}
          fill="rgba(0,0,0,0.12)"
          rx={4}
        />

        <line
          x1={padX}
          y1={zeroY}
          x2={width - padX}
          y2={zeroY}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />

        {areaPath && (
          <path d={areaPath} fill="url(#eval-area-grad)" stroke="none" />
        )}
        <path
          d={linePath}
          fill="none"
          stroke="url(#eval-line-grad)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {coords.map((c) => {
          const isSelected = selectedIndex === c.index;
          const color = pointColor(c.class);
          return (
            <g key={c.index}>
              {isSelected && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={9}
                  fill={color}
                  opacity={0.2}
                />
              )}
              <circle
                cx={c.x}
                cy={c.y}
                r={isSelected ? 5 : 3.5}
                fill={color}
                stroke={isSelected ? "#fff" : "rgba(0,0,0,0.4)"}
                strokeWidth={isSelected ? 1.5 : 0.5}
                className="cursor-pointer transition-all hover:opacity-100"
                opacity={isSelected ? 1 : 0.85}
                onClick={() => onSelect?.(c.index)}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between items-center text-[10px] opacity-40 px-1 mt-1.5">
        <span>{t("chess.analysis.graphStart")}</span>
        <span className="opacity-60">0.0</span>
        <span>{t("chess.analysis.graphEnd")}</span>
      </div>
    </div>
  );

  if (!framed) return chart;

  return (
    <div className="rounded-xl bg-black/20 border border-white/8 p-4 space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-africhess-gold/90">
        {t("chess.analysis.graphLabel")}
      </p>
      {chart}
    </div>
  );
}
