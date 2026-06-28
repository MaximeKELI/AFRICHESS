"use client";

import { memo, useMemo } from "react";
import {
  ClockedPlayerStrip,
  LiveClockProvider,
  PlayBoardCore,
} from "@/components/play/LiveClockBoard";
import type { ApiMove, CapturedState } from "@/lib/chessDisplay";
import { lastMoveFromMoves, turnFromFen } from "@/lib/gameDisplayFast";

export interface PlayerStripConfig {
  player: import("@/lib/gamePlayers").PlayerDisplayInfo;
  side: "white" | "black";
}

interface PlayBoardSectionProps {
  fen: string;
  moves?: ApiMove[];
  orientation: "white" | "black";
  disabled: boolean;
  playerColor: "w" | "b";
  onMove: (uci: string) => void;
  onPremove?: () => void;
  enablePremoves?: boolean;
  showClock: boolean;
  whiteMs: number;
  blackMs: number;
  clockRunning: boolean;
  incrementMs: number;
  clockLabel: string;
  serverValidated?: boolean;
  pendingDrop?: string | null;
  onDropAtSquare?: (uci: string) => void;
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
  const lastMove = useMemo(() => lastMoveFromMoves(moves), [moves]);
  const clockActive = clockRunning && showClock;

  return (
    <div className="game-board-stack w-full min-w-0 max-w-full">
      <LiveClockProvider
        whiteMs={whiteMs}
        blackMs={blackMs}
        turn={turn}
        running={clockActive}
      >
        {topPlayer && (
          <ClockedPlayerStrip
            config={topPlayer}
            position="top"
            showClock={showClock}
            clockRunning={clockRunning}
            turn={turn}
            incrementMs={incrementMs}
            clockLabel={clockLabel}
          />
        )}
        <PlayBoardCore
          fen={fen}
          orientation={orientation}
          disabled={disabled}
          playerColor={playerColor}
          onMove={onMove}
          serverValidated={serverValidated}
          pendingDrop={pendingDrop}
          onDropAtSquare={onDropAtSquare}
          extraBottom={extraBottom}
          captured={captured}
          lastMove={lastMove}
        />
        {bottomPlayer && (
          <ClockedPlayerStrip
            config={bottomPlayer}
            position="bottom"
            showClock={showClock}
            clockRunning={clockRunning}
            turn={turn}
            incrementMs={incrementMs}
            clockLabel={clockLabel}
          />
        )}
      </LiveClockProvider>
    </div>
  );
}

export const PlayBoardSection = memo(PlayBoardSectionInner);
