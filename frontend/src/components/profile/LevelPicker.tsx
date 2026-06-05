"use client";

import { CHESS_LEVELS, type ChessLevelId } from "@/lib/avatars";
import { clsx } from "clsx";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelDesc, chessLevelLabel } from "@/lib/i18n/labels";

interface LevelPickerProps {
  value: ChessLevelId;
  onChange: (id: ChessLevelId) => void;
}

export function LevelPicker({ value, onChange }: LevelPickerProps) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-sm font-medium mb-3">{t("profile.level.question")}</p>
      <div className="space-y-2">
        {CHESS_LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => onChange(level.id)}
            className={clsx(
              "w-full text-left p-4 rounded-xl border transition-all",
              value === level.id
                ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold"
                : "border-white/10 hover:border-white/25 hover:bg-white/5"
            )}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold">{chessLevelLabel(t, level.id)}</span>
              <span className="text-xs font-mono text-africhess-green shrink-0">~{level.elo} ELO</span>
            </div>
            <p className="text-sm opacity-60 mt-1">{chessLevelDesc(t, level.id)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
