"use client";

import { memo, type ReactNode } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameClock } from "@/components/chess/GameClock";
import type { ApiMove } from "@/lib/chessDisplay";
import { lastMoveFromMoves, turnFromFen } from "@/lib/gameDisplayFast";

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
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  extraBottom?: number;
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
  topBar,
  bottomBar,
  extraBottom = 0,
}: PlayBoardSectionProps) {
  const turn = turnFromFen(fen);
  const lastMove = lastMoveFromMoves(moves);

  return (
    <div className="game-board-stack w-full min-w-0 max-w-full">
      <div className="space-y-2 mb-2">
        {topBar}
        {showClock && (
          <GameClock
            whiteMs={whiteMs}
            blackMs={blackMs}
            turn={turn}
            running={clockRunning}
            orientation={orientation}
            incrementMs={incrementMs}
            label={clockLabel}
            position="top"
          />
        )}
      </div>
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
      <div className="space-y-2 mt-2">
        {showClock && (
          <GameClock
            whiteMs={whiteMs}
            blackMs={blackMs}
            turn={turn}
            running={clockRunning}
            orientation={orientation}
            incrementMs={incrementMs}
            position="bottom"
          />
        )}
        {bottomBar}
      </div>
    </div>
  );
}

export const PlayBoardSection = memo(PlayBoardSectionInner);
