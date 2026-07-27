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
    <div className="flex flex-wrap items-center justify-center gap-1 pt-2 mt-1 border-t border-white/10 shrink-0">
      <button
        type="button"
        onClick={onFirst}
        disabled={disabled || ply <= 0}
        aria-label={t("chess.moves.first")}
        className="p-2 rounded-md border border-white/15 disabled:opacity-35 hover:bg-white/10 hover:border-africhess-gold/40"
      >
        <ChevronsLeft className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled || ply <= 0}
        aria-label={t("chess.moves.prev")}
        className="p-2 rounded-md border border-white/15 disabled:opacity-35 hover:bg-white/10 hover:border-africhess-gold/40"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || ply >= total}
        aria-label={t("chess.moves.next")}
        className="p-2 rounded-md border border-white/15 disabled:opacity-35 hover:bg-white/10 hover:border-africhess-gold/40"
      >
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onLast}
        disabled={disabled || ply >= total}
        aria-label={t("chess.moves.last")}
        className="p-2 rounded-md border border-white/15 disabled:opacity-35 hover:bg-white/10 hover:border-africhess-gold/40"
      >
        <ChevronsRight className="w-4 h-4" aria-hidden />
      </button>
      {onLive && (
        <button
          type="button"
          onClick={onLive}
          disabled={disabled || isLive}
          aria-label={t("chess.moves.goLive")}
          className={`inline-flex items-center gap-1 px-2.5 py-2 text-[11px] rounded-md border disabled:opacity-35 ${
            isLive
              ? "border-africhess-gold/50 text-africhess-gold"
              : "border-white/15 hover:border-africhess-gold/40 hover:bg-white/10"
          }`}
        >
          <Radio className="w-3.5 h-3.5" aria-hidden />
          {t("chess.moves.live")}
        </button>
      )}
    </div>
  );
});
