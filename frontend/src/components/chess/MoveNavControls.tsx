"use client";

import { memo } from "react";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface MoveNavControlsProps {
  ply: number;
  total: number;
  isLive: boolean;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onLive?: () => void;
  disabled?: boolean;
}

export const MoveNavControls = memo(function MoveNavControls({
  ply,
  total,
  isLive,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onLive,
  disabled = false,
}: MoveNavControlsProps) {
  const { t } = useTranslation();
  if (total <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-white/10">
      <button
        type="button"
        onClick={onFirst}
        disabled={disabled || ply <= 0}
        aria-label={t("chess.moves.first")}
        className="p-1.5 rounded-lg border border-white/15 disabled:opacity-35 hover:border-africhess-gold/40"
      >
        <ChevronsLeft className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled || ply <= 0}
        aria-label={t("chess.moves.prev")}
        className="px-2.5 py-1.5 text-xs rounded-lg border border-white/15 disabled:opacity-35 hover:border-africhess-gold/40"
      >
        <ChevronLeft className="w-3.5 h-3.5 inline" aria-hidden />
      </button>
      <span className="text-[11px] font-mono opacity-60 min-w-[4.5rem] text-center tabular-nums">
        {t("chess.moves.plyOf", { current: ply, total })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || ply >= total}
        aria-label={t("chess.moves.next")}
        className="px-2.5 py-1.5 text-xs rounded-lg border border-white/15 disabled:opacity-35 hover:border-africhess-gold/40"
      >
        <ChevronRight className="w-3.5 h-3.5 inline" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onLast}
        disabled={disabled || ply >= total}
        aria-label={t("chess.moves.last")}
        className="p-1.5 rounded-lg border border-white/15 disabled:opacity-35 hover:border-africhess-gold/40"
      >
        <ChevronsRight className="w-3.5 h-3.5" aria-hidden />
      </button>
      {onLive && (
        <button
          type="button"
          onClick={onLive}
          disabled={disabled || isLive}
          aria-label={t("chess.moves.goLive")}
          className={`inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-lg border disabled:opacity-35 ${
            isLive
              ? "border-africhess-gold/50 text-africhess-gold"
              : "border-white/15 hover:border-africhess-gold/40"
          }`}
        >
          <Radio className="w-3 h-3" aria-hidden />
          {t("chess.moves.live")}
        </button>
      )}
    </div>
  );
});
