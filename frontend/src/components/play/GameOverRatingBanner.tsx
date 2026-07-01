"use client";

import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";
import { modeLabel } from "@/lib/i18n/labels";
import {
  formatElo,
  formatRatingChange,
  type GameRatingChanges,
} from "@/lib/ratings";

export interface GameOverRatingBannerProps {
  ratingChanges: GameRatingChanges;
  playerIsWhite: boolean;
  mode: string;
  provisional?: boolean;
}

export function GameOverRatingBanner({
  ratingChanges,
  playerIsWhite,
  mode,
  provisional = false,
}: GameOverRatingBannerProps) {
  const { t } = useTranslation();
  const side = playerIsWhite ? "white" : "black";
  const change = ratingChanges[side];
  if (!change) return null;

  const positive = change.change > 0;
  const neutral = change.change === 0;

  return (
    <div
      className="glass-card p-4 text-center border border-africhess-gold/30 animate-in fade-in duration-500"
      role="status"
      aria-live="polite"
    >
      <p
        className={clsx(
          "text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight",
          neutral && "text-white/80",
          positive && "text-emerald-400",
          !positive && !neutral && "text-red-400"
        )}
      >
        {formatRatingChange(change.change)}
      </p>
      <p className="text-sm opacity-80 mt-1 tabular-nums font-mono">
        {t("play.rating.beforeAfter", {
          before: formatElo(change.elo_before, provisional),
          after: formatElo(change.elo_after, provisional),
        })}
      </p>
      <p className="text-xs opacity-50 mt-0.5">{modeLabel(t, mode)}</p>
    </div>
  );
}
