"use client";

import clsx from "clsx";
import { moveClassSymbol } from "@/lib/coachReview";

const BADGE_STYLES: Record<string, string> = {
  brilliant: "bg-cyan-500 border-cyan-300 text-white shadow-cyan-500/50",
  great: "bg-sky-500 border-sky-300 text-white shadow-sky-500/50",
  best: "bg-emerald-600 border-emerald-400 text-white shadow-emerald-600/40",
  book: "bg-violet-600 border-violet-300 text-white shadow-violet-600/40",
  good: "bg-emerald-700/90 border-emerald-500/80 text-white shadow-emerald-700/30",
  inaccuracy: "bg-yellow-500 border-yellow-300 text-black shadow-yellow-500/40",
  mistake: "bg-orange-500 border-orange-300 text-white shadow-orange-500/40",
  blunder: "bg-red-600 border-red-400 text-white shadow-red-600/50",
};

interface MoveClassPieceBadgeProps {
  moveClass: string;
}

/** Badge de classification sur la pièce (style revue Chess.com). */
export function MoveClassPieceBadge({ moveClass }: MoveClassPieceBadgeProps) {
  const symbol = moveClassSymbol(moveClass);
  const style = BADGE_STYLES[moveClass] ?? BADGE_STYLES.good;

  return (
    <span
      className={clsx(
        "absolute z-20 top-[3%] right-[3%] flex items-center justify-center",
        "w-[28%] h-[28%] min-w-[20px] min-h-[20px] max-w-[34px] max-h-[34px]",
        "rounded-full border-2 font-black leading-none shadow-md pointer-events-none",
        style
      )}
      aria-hidden
    >
      <span className={clsx(moveClass === "brilliant" ? "text-[0.55em]" : "text-[0.65em]")}>
        {symbol}
      </span>
    </span>
  );
}
