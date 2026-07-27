"use client";

import { memo } from "react";
import { MoveHistory } from "./MoveHistory";
import type { MoveRow } from "@/lib/chessDisplay";
import { useTranslation } from "@/hooks/useTranslation";

interface GameSidePanelProps {
  moves: MoveRow[];
  isCheck?: boolean;
  turn?: "w" | "b";
  openingName?: string;
  currentPly?: number;
  totalPlies?: number;
  isLive?: boolean;
  onSelectPly?: (ply: number) => void;
  onGoLive?: () => void;
  /** Affiche la barre ⏮◀▶⏭ + Live (parties en cours / revue locale). */
  enablePlyNav?: boolean;
  /** Bandeau quand on consulte l'historique sans pouvoir jouer. */
  viewingHistory?: boolean;
}

export const GameSidePanel = memo(function GameSidePanel({
  moves,
  isCheck = false,
  turn = "w",
  openingName,
  currentPly,
  totalPlies = 0,
  isLive = true,
  onSelectPly,
  onGoLive,
  enablePlyNav = false,
  viewingHistory = false,
}: GameSidePanelProps) {
  const { t } = useTranslation();

  return (
    <div className="glass-card p-4 space-y-4 h-full">
      {openingName && (
        <p className="text-xs text-africhess-gold font-medium border-b border-white/10 pb-2">
          📖 {openingName}
        </p>
      )}
      {viewingHistory && (
        <p className="text-xs rounded-lg border border-africhess-gold/30 bg-africhess-gold/10 px-2.5 py-1.5 text-africhess-gold">
          {t("chess.moves.viewingHint")}
        </p>
      )}
      {isCheck && !viewingHistory && (
        <p className="text-sm font-semibold text-africhess-terracotta animate-pulse">
          {t("chess.check", {
            color: turn === "w" ? t("chess.check.white") : t("chess.check.black"),
          })}
        </p>
      )}
      <MoveHistory
        moves={moves}
        currentPly={currentPly}
        totalPlies={totalPlies}
        isLive={isLive}
        onSelectPly={enablePlyNav ? onSelectPly : undefined}
        onGoLive={enablePlyNav ? onGoLive : undefined}
        showNav={enablePlyNav}
      />
      {enablePlyNav && (
        <p className="text-[10px] opacity-45 leading-snug">
          {t("chess.arrows.hint")}
        </p>
      )}
    </div>
  );
});
