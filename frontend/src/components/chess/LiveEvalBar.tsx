"use client";

import { formatEvalDisplay } from "@/lib/coachReview";

interface LiveEvalBarProps {
  evaluation: number | null;
  turn?: "w" | "b";
  loading?: boolean;
}

export function LiveEvalBar({ evaluation, turn = "w", loading }: LiveEvalBarProps) {
  const label = loading ? "…" : formatEvalDisplay(evaluation ?? undefined);
  const cp = evaluation != null ? Math.max(-10, Math.min(10, evaluation)) : 0;
  const whitePct = 50 + (cp / 10) * 45;

  return (
    <div className="w-full h-7 rounded-lg overflow-hidden flex relative border border-white/10">
      <div
        className="h-full bg-white/90 transition-all duration-500"
        style={{ width: `${whitePct}%` }}
      />
      <div
        className="h-full bg-neutral-800 flex-1 transition-all duration-500"
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white mix-blend-difference">
        {label}
        {turn && !loading && (
          <span className="ml-2 opacity-70 font-sans font-normal">
            {turn === "w" ? "♔" : "♚"}
          </span>
        )}
      </span>
    </div>
  );
}
