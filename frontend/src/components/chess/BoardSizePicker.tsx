"use client";

import {
  BOARD_SIZE_DEFAULT,
  BOARD_SIZE_MAX,
  BOARD_SIZE_MIN,
  BOARD_SIZE_STEP,
  usePreferencesStore,
} from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";

interface BoardSizePickerProps {
  compact?: boolean;
  showHeader?: boolean;
  /** Curseur minimal sous l'échiquier pendant une partie. */
  inline?: boolean;
}

export function BoardSizePicker({
  compact = false,
  showHeader = true,
  inline = false,
}: BoardSizePickerProps) {
  const boardSize = usePreferencesStore((s) => s.boardSize);
  const setBoardSize = usePreferencesStore((s) => s.setBoardSize);
  const { t } = useTranslation();

  const isDefault = boardSize === BOARD_SIZE_DEFAULT;

  if (inline) {
    return (
      <div
        className="flex flex-col gap-1.5 w-full max-w-[min(100%,820px)] mx-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2.5"
        data-testid="board-size-slider"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-africhess-gold">
            {t("board.size.title")}
          </span>
          <span className="text-xs tabular-nums opacity-70">{boardSize}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] opacity-50 select-none shrink-0" aria-hidden>
            −
          </span>
          <input
            type="range"
            min={BOARD_SIZE_MIN}
            max={BOARD_SIZE_MAX}
            step={BOARD_SIZE_STEP}
            value={boardSize}
            onChange={(e) => setBoardSize(Number(e.target.value))}
            aria-label={t("board.size.title")}
            className="flex-1 h-2 accent-africhess-gold cursor-pointer"
          />
          <span className="text-[11px] opacity-50 select-none shrink-0" aria-hidden>
            +
          </span>
          <button
            type="button"
            onClick={() => setBoardSize(BOARD_SIZE_DEFAULT)}
            disabled={isDefault}
            className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-africhess-gold disabled:opacity-30 disabled:cursor-default hover:border-africhess-gold/40 shrink-0"
          >
            {t("board.size.reset")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="board-size-slider">
      {showHeader && (
        <div className="flex items-baseline justify-between gap-2">
          <span className={`font-medium ${compact ? "text-xs" : "text-sm"}`}>
            {t("board.size.title")}
          </span>
          <span className="text-xs tabular-nums opacity-70">{boardSize}%</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-[10px] opacity-50 select-none">A</span>
        <input
          type="range"
          min={BOARD_SIZE_MIN}
          max={BOARD_SIZE_MAX}
          step={BOARD_SIZE_STEP}
          value={boardSize}
          onChange={(e) => setBoardSize(Number(e.target.value))}
          aria-label={t("board.size.title")}
          className="flex-1 accent-africhess-gold cursor-pointer"
        />
        <span className="text-sm opacity-50 select-none">A</span>
        {!showHeader && (
          <span className="text-xs tabular-nums opacity-70 w-10 text-right">
            {boardSize}%
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] opacity-45">{t("board.size.hint")}</p>
        <button
          type="button"
          onClick={() => setBoardSize(BOARD_SIZE_DEFAULT)}
          disabled={isDefault}
          className="text-[10px] px-2 py-0.5 rounded border border-white/15 text-africhess-gold disabled:opacity-30 disabled:cursor-default hover:border-africhess-gold/40 shrink-0"
        >
          {t("board.size.reset")}
        </button>
      </div>
    </div>
  );
}
