"use client";

import { memo } from "react";
import { CapturedBoardStack } from "@/components/chess/CapturedBoardStack";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GamePlayerStrip, type GamePlayerStripProps } from "@/components/play/GamePlayerStrip";
import type { PlayerDisplayInfo } from "@/lib/gamePlayers";
import { useLiveClock } from "@/hooks/useLiveClock";
import type { ApiMove, CapturedState } from "@/lib/chessDisplay";
import { lastMoveFromMoves, turnFromFen } from "@/lib/gameDisplayFast";

export interface PlayerStripConfig {
  player: PlayerDisplayInfo;
  side: "white" | "black";
}

interface PlayBoardSectionProps {
  fen: string;
  moves?: ApiMove[];
  orientation: "white" | "black";
  disabled: boolean;
  playerColor: "w" | "b";
  onMove: (uci: string) => void;
  showClock: boolean;
  whiteMs: number;
  blackMs: number;
  clockRunning: boolean;
  incrementMs: number;
  clockLabel: string;
  serverValidated?: boolean;
  pendingDrop?: string | null;
  onDropAtSquare?: (uci: string) => void;
  /** Barres joueur style Chess.com (nom, drapeau, ELO + horloge). */
  topPlayer?: PlayerStripConfig;
  bottomPlayer?: PlayerStripConfig;
  extraBottom?: number;
  captured?: CapturedState;
}

function PlayBoardSectionInner({
  fen,
  moves,
  orientation,
  disabled,
  playerColor,
  onMove,
  showClock,
  whiteMs,
  blackMs,
  clockRunning,
  incrementMs,
  clockLabel,
  serverValidated = false,
  pendingDrop = null,
  onDropAtSquare,
  topPlayer,
  bottomPlayer,
  extraBottom = 0,
  captured,
}: PlayBoardSectionProps) {
  const turn = turnFromFen(fen);
  const lastMove = lastMoveFromMoves(moves);
  const { white, black } = useLiveClock(whiteMs, blackMs, turn, clockRunning && showClock);

  const msForSide = (side: "white" | "black") => (side === "white" ? white : black);
  const activeForSide = (side: "white" | "black") =>
    (side === "white" ? turn === "w" : turn === "b") && clockRunning;

  const stripProps = (
    config: PlayerStripConfig | undefined,
    position: "top" | "bottom"
  ): GamePlayerStripProps | null => {
    if (!config) return null;
    const ms = msForSide(config.side);
    return {
      player: config.player,
      clockMs: showClock ? ms : undefined,
      clockActive: showClock ? activeForSide(config.side) : false,
      clockRunning: showClock && clockRunning,
      clockLabel:
        position === "top" && showClock && incrementMs > 0
          ? `${clockLabel} · +${incrementMs / 1000}s`
          : position === "top" && showClock
            ? clockLabel
            : undefined,
    };
  };

  const topStrip = stripProps(topPlayer, "top");
  const bottomStrip = stripProps(bottomPlayer, "bottom");

  return (
    <div className="game-board-stack w-full min-w-0 max-w-full">
      {topStrip && (
        <div className="mb-1.5">
          <GamePlayerStrip {...topStrip} />
        </div>
      )}
      <CapturedBoardStack captured={captured} orientation={orientation}>
        <ChessBoard
          fen={fen}
          orientation={orientation}
          onMove={onMove}
          disabled={disabled}
          playerColor={playerColor}
          lastMove={lastMove}
          playSoundOnFenChange={true}
          serverValidated={serverValidated}
          pendingDrop={pendingDrop}
          onDropAtSquare={onDropAtSquare}
          extraBottom={extraBottom}
        />
      </CapturedBoardStack>
      {bottomStrip && (
        <div className="mt-1.5">
          <GamePlayerStrip {...bottomStrip} />
        </div>
      )}
    </div>
  );
}

export const PlayBoardSection = memo(PlayBoardSectionInner);
