"use client";

import clsx from "clsx";
import { PIECE_SYMBOLS } from "@/lib/chessDisplay";
import { useTranslation } from "@/hooks/useTranslation";

const PIECE_KEYS: Record<string, string> = {
  P: "wP",
  N: "wN",
  B: "wB",
  R: "wR",
  Q: "wQ",
  p: "bP",
  n: "bN",
  b: "bB",
  r: "bR",
  q: "bQ",
};

interface PocketBarProps {
  pieces: string[];
  selected: string | null;
  onSelect: (piece: string | null) => void;
  disabled?: boolean;
}

export function PocketBar({ pieces, selected, onSelect, disabled }: PocketBarProps) {
  const { t } = useTranslation();

  if (pieces.length === 0) {
    return (
      <p className="text-xs opacity-50 text-center py-1">{t("crazyhouse.pocketEmpty")}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center py-2">
      <span className="text-[10px] uppercase tracking-wide opacity-50 mr-1">
        {t("crazyhouse.pocket")}
      </span>
      {pieces.map((p, i) => {
        const key = PIECE_KEYS[p] ?? p;
        const sym = PIECE_SYMBOLS[key] ?? p;
        return (
          <button
            key={`${p}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(selected === p ? null : p)}
            className={clsx(
              "w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-colors",
              selected === p
                ? "border-africhess-gold bg-africhess-gold/20 ring-2 ring-africhess-gold"
                : "border-white/20 hover:border-africhess-gold/50"
            )}
            title={t("crazyhouse.dropHint")}
          >
            {sym}
          </button>
        );
      })}
      {selected && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-africhess-gold hover:underline ml-2"
        >
          {t("crazyhouse.cancelDrop")}
        </button>
      )}
    </div>
  );
}
