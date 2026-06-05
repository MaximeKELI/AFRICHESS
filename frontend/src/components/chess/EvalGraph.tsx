"use client";

import { useMemo } from "react";
import clsx from "clsx";
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
}

function clampEval(cp: number): number {
  return Math.max(-800, Math.min(800, cp));
}

export function EvalGraph({
  points,
  selectedIndex = null,
  onSelect,
  height = 120,
}: EvalGraphProps) {
  const { t } = useTranslation();
  const width = 320;
  const pad = 8;

  const coords = useMemo(() => {
    if (!points.length) return [];
    const maxX = Math.max(points.length - 1, 1);
    return points.map((p, i) => {
      const evalCp = typeof p.eval === "number" ? p.eval * 100 : 0;
      const yNorm = 0.5 - clampEval(evalCp) / 1600;
      return {
        x: pad + (i / maxX) * (width - pad * 2),
        y: pad + yNorm * (height - pad * 2),
        ...p,
        index: i,
      };
    });
  }, [points, height]);

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const zeroY = pad + 0.5 * (height - pad * 2);

  if (!points.length) {
    return (
      <p className="text-xs opacity-50 text-center py-4">{t("chess.analysis.graphEmpty")}</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-full h-auto"
        role="img"
        aria-label={t("chess.analysis.graphLabel")}
      >
        <rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.15)" rx={8} />
        <line
          x1={pad}
          y1={zeroY}
          x2={width - pad}
          y2={zeroY}
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="4 4"
        />
        <path d={linePath} fill="none" stroke="#D4A017" strokeWidth={2} strokeLinejoin="round" />
        {coords.map((c) => (
          <circle
            key={c.index}
            cx={c.x}
            cy={c.y}
            r={selectedIndex === c.index ? 5 : 3}
            className={clsx(
              "cursor-pointer transition-all",
              c.class === "blunder"
                ? "fill-africhess-terracotta"
                : c.class === "mistake"
                  ? "fill-orange-400"
                  : "fill-africhess-green"
            )}
            onClick={() => onSelect?.(c.index)}
          />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] opacity-40 px-1 mt-1">
        <span>{t("chess.analysis.graphStart")}</span>
        <span>{t("chess.analysis.graphEnd")}</span>
      </div>
    </div>
  );
}
