"use client";

import { memo, useMemo } from "react";
import { BoardSizePicker } from "@/components/chess/BoardSizePicker";
import {
  ClockedPlayerStrip,
  LiveClockProvider,
  PlayBoardCore,
  useStripCaptures,
} from "@/components/play/LiveClockBoard";
import type { ApiMove, CapturedState } from "@/lib/chessDisplay";
import { lastMoveFromMoves, turnFromFen } from "@/lib/gameDisplayFast";

export interface PlayerStripConfig {
  player: import("@/lib/gamePlayers").PlayerDisplayInfo;
  side: "white" | "black";
}

interface PlayBoardSectionProps {
  fen: string;
  /** FEN live pour l'horloge (si différent du FEN affiché en revue locale). */
  clockFen?: string;
  moves?: ApiMove[];
  /** Surbrillance last-move (ex. position revue) — sinon dérivé de `moves`. */
  lastMove?: { from: string; to: string } | null;
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
  blindMode?: boolean;
  onFlag?: (side: "w" | "b") => void;
  playSoundOnFenChange?: boolean;
  areArrowsAllowed?: boolean;
  premove?: { from: string; to: string } | null;
  onClearPremove?: () => void;
  /** Masque le sélecteur de taille pendant une partie active. */
  hideBoardSizePicker?: boolean;
}

function PlayBoardSectionInner({
  fen,
  clockFen,
  moves,
  lastMove: lastMoveProp,
  orientation,
  disabled,
  playerColor,
  onMove,
  onPremove,
  enablePremoves = false,
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
  blindMode = false,
  onFlag,
  playSoundOnFenChange = true,
  areArrowsAllowed = true,
  premove = null,
  onClearPremove,
  hideBoardSizePicker = false,
}: PlayBoardSectionProps) {
  const turn = turnFromFen(clockFen ?? fen);
  const lastMove = useMemo(
    () => lastMoveProp ?? lastMoveFromMoves(moves),
    [lastMoveProp, moves]
  );
  const clockActive = clockRunning && showClock;
  const stripCaptures = useStripCaptures(captured, orientation);

  return (
    <div className="game-board-stack w-full min-w-0 max-w-full">
      <LiveClockProvider
        whiteMs={whiteMs}
        blackMs={blackMs}
        turn={turn}
        running={clockActive}
        onFlag={onFlag}
      >
        <div className="play-board-column flex flex-col w-full min-w-0">
          {topPlayer && (
            <ClockedPlayerStrip
              config={topPlayer}
              position="top"
              showClock={showClock}
              clockRunning={clockRunning}
              turn={turn}
              incrementMs={incrementMs}
              clockLabel={clockLabel}
              capturedPieces={stripCaptures.top}
              materialAdvantage={stripCaptures.topAdvantage}
            />
          )}
          <div className="play-board-frame">
            <PlayBoardCore
              fen={fen}
              orientation={orientation}
              disabled={disabled}
              playerColor={playerColor}
              onMove={onMove}
              onPremove={onPremove}
              enablePremoves={enablePremoves}
              serverValidated={serverValidated}
              pendingDrop={pendingDrop}
              onDropAtSquare={onDropAtSquare}
              extraBottom={extraBottom}
              lastMove={lastMove}
              blindMode={blindMode}
              playSoundOnFenChange={playSoundOnFenChange}
              areArrowsAllowed={areArrowsAllowed}
              premove={premove}
              onClearPremove={onClearPremove}
            />
          </div>
          {bottomPlayer && (
            <ClockedPlayerStrip
              config={bottomPlayer}
              position="bottom"
              showClock={showClock}
              clockRunning={clockRunning}
              turn={turn}
              incrementMs={incrementMs}
              clockLabel={clockLabel}
              capturedPieces={stripCaptures.bottom}
              materialAdvantage={stripCaptures.bottomAdvantage}
            />
          )}
        </div>
      </LiveClockProvider>
      {!hideBoardSizePicker && (
        <div className="mt-2 hide-in-zen">
          <BoardSizePicker inline />
        </div>
      )}
    </div>
  );
}

export const PlayBoardSection = memo(PlayBoardSectionInner);
