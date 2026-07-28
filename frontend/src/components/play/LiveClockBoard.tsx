"use client";

import { createContext, memo, useContext, useMemo, type ReactNode } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GamePlayerStrip, type GamePlayerStripProps } from "@/components/play/GamePlayerStrip";
import type { PlayerStripConfig } from "@/components/play/PlayBoardSection";
import { useLiveClock } from "@/hooks/useLiveClock";
import type { CapturedState } from "@/lib/chessDisplay";
import { resolveCapturedSides } from "@/lib/capturedSides";

type LiveClockValue = { white: number; black: number };

const LiveClockContext = createContext<LiveClockValue | null>(null);

interface LiveClockProviderProps {
  whiteMs: number;
  blackMs: number;
  turn: "w" | "b";
  running: boolean;
  onFlag?: (side: "w" | "b") => void;
  children: ReactNode;
}

/** Horloge partagée — seuls les consommateurs du contexte re-renderent au tick. */
export function LiveClockProvider({
  whiteMs,
  blackMs,
  turn,
  running,
  onFlag,
  children,
}: LiveClockProviderProps) {
  const clock = useLiveClock(whiteMs, blackMs, turn, running, onFlag);
  return <LiveClockContext.Provider value={clock}>{children}</LiveClockContext.Provider>;
}

function useLiveClockMs(side: "white" | "black"): number | undefined {
  const clock = useContext(LiveClockContext);
  if (!clock) return undefined;
  return side === "white" ? clock.white : clock.black;
}

interface ClockedPlayerStripProps {
  config: PlayerStripConfig;
  position: "top" | "bottom";
  showClock: boolean;
  clockRunning: boolean;
  turn: "w" | "b";
  incrementMs: number;
  clockLabel: string;
  capturedPieces?: string[];
  materialAdvantage?: number;
  outcome?: "win" | "loss" | "draw" | null;
}

function ClockedPlayerStripInner({
  config,
  position,
  showClock,
  clockRunning,
  turn,
  incrementMs,
  clockLabel,
  capturedPieces,
  materialAdvantage,
  outcome,
}: ClockedPlayerStripProps) {
  const ms = useLiveClockMs(config.side);
  const clockActive =
    showClock && (config.side === "white" ? turn === "w" : turn === "b") && clockRunning;

  const strip: GamePlayerStripProps = {
    player: config.player,
    clockMs: showClock && ms != null ? ms : undefined,
    clockActive,
    clockRunning: showClock && clockRunning,
    clockLabel:
      position === "top" && showClock && incrementMs > 0
        ? `${clockLabel} · +${incrementMs / 1000}s`
        : position === "top" && showClock
          ? clockLabel
          : undefined,
    capturedPieces,
    materialAdvantage,
    outcome,
  };

  return <GamePlayerStrip {...strip} />;
}

export const ClockedPlayerStrip = memo(ClockedPlayerStripInner);

export interface PlayBoardCoreProps {
  fen: string;
  orientation: "white" | "black";
  disabled: boolean;
  playerColor: "w" | "b";
  onMove: (uci: string) => void;
  onPremove?: () => void;
  enablePremoves?: boolean;
  serverValidated?: boolean;
  pendingDrop?: string | null;
  onDropAtSquare?: (uci: string) => void;
  extraBottom?: number;
  lastMove: { from: string; to: string } | null;
  blindMode?: boolean;
  playSoundOnFenChange?: boolean;
  areArrowsAllowed?: boolean;
  premove?: { from: string; to: string } | null;
  onClearPremove?: () => void;
  showAnnotationToolbar?: boolean;
  hintArrow?: { from: string; to: string } | null;
}

function PlayBoardCoreInner({
  fen,
  orientation,
  disabled,
  playerColor,
  onMove,
  onPremove,
  enablePremoves = false,
  serverValidated = false,
  pendingDrop = null,
  onDropAtSquare,
  extraBottom = 0,
  lastMove,
  blindMode = false,
  playSoundOnFenChange = true,
  areArrowsAllowed = true,
  premove = null,
  onClearPremove,
  showAnnotationToolbar = false,
  hintArrow = null,
}: PlayBoardCoreProps) {
  return (
    <ChessBoard
      fen={fen}
      orientation={orientation}
      onMove={onMove}
      onPremove={onPremove}
      enablePremoves={enablePremoves}
      disabled={disabled}
      playerColor={playerColor}
      lastMove={lastMove}
      playSoundOnFenChange={playSoundOnFenChange}
      serverValidated={serverValidated}
      pendingDrop={pendingDrop}
      onDropAtSquare={onDropAtSquare}
      extraBottom={extraBottom}
      blindMode={blindMode}
      areArrowsAllowed={areArrowsAllowed}
      premove={premove}
      onClearPremove={onClearPremove}
      showAnnotationToolbar={showAnnotationToolbar}
      hintArrow={hintArrow}
    />
  );
}

export const PlayBoardCore = memo(PlayBoardCoreInner);

/** Résout captures haut/bas pour les barres joueur (évite double calcul). */
export function useStripCaptures(
  captured: CapturedState | undefined,
  orientation: "white" | "black"
) {
  return useMemo(() => {
    if (!captured) {
      return {
        top: [] as string[],
        bottom: [] as string[],
        topAdvantage: undefined as number | undefined,
        bottomAdvantage: undefined as number | undefined,
      };
    }
    return resolveCapturedSides(captured, orientation);
  }, [captured, orientation]);
}
