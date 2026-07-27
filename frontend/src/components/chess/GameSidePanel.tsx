"use client";

import { memo, type ReactNode } from "react";
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
  /** Actions sous la navigation (bilan, abandon, etc.). */
  footer?: ReactNode;
  /** Colonne pleine hauteur alignée sur le plateau. */
  fillHeight?: boolean;
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
  footer,
  fillHeight = false,
}: GameSidePanelProps) {
  const { t } = useTranslation();

  return (
    <div
      className={
        fillHeight
          ? "glass-card p-3 sm:p-4 flex flex-col min-h-0 h-full gap-2"
          : "glass-card p-3 sm:p-4 flex flex-col gap-2"
      }
    >
      {openingName && (
        <p className="text-xs text-africhess-gold font-medium border-b border-white/10 pb-2 shrink-0 truncate">
          {openingName}
        </p>
      )}
      {viewingHistory && (
        <p className="text-xs rounded-lg border border-africhess-gold/30 bg-africhess-gold/10 px-2.5 py-1.5 text-africhess-gold shrink-0">
          {t("chess.moves.viewingHint")}
        </p>
      )}
      {isCheck && !viewingHistory && (
        <p className="text-sm font-semibold text-africhess-terracotta shrink-0">
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
        fillHeight={fillHeight}
      />
      {footer && <div className="shrink-0 pt-1 border-t border-white/10 space-y-2">{footer}</div>}
    </div>
  );
});
