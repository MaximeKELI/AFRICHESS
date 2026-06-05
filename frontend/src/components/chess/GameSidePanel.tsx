"use client";

import { CapturedPieces } from "./CapturedPieces";
import { MoveHistory } from "./MoveHistory";
import type { CapturedState, MoveRow } from "@/lib/chessDisplay";
import { useTranslation } from "@/hooks/useTranslation";

interface GameSidePanelProps {
  moves: MoveRow[];
  captured: CapturedState;
  orientation?: "white" | "black";
  isCheck?: boolean;
  turn?: "w" | "b";
  openingName?: string;
}

export function GameSidePanel({
  moves,
  captured,
  orientation = "white",
  isCheck = false,
  turn = "w",
  openingName,
}: GameSidePanelProps) {
  const { t } = useTranslation();

  return (
    <div className="glass-card p-4 space-y-4 h-full">
      {openingName && (
        <p className="text-xs text-africhess-gold font-medium border-b border-white/10 pb-2">
          📖 {openingName}
        </p>
      )}
      {isCheck && (
        <p className="text-sm font-semibold text-africhess-terracotta animate-pulse">
          {t("chess.check", {
            color: turn === "w" ? t("chess.check.white") : t("chess.check.black"),
          })}
        </p>
      )}
      <CapturedPieces captured={captured} orientation={orientation} />
      <hr className="border-white/10" />
      <MoveHistory moves={moves} />
    </div>
  );
}
