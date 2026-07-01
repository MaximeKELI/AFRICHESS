"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  applyPuzzleMove,
  buildPuzzleFen,
  isPlayerTurn,
  puzzleOrientation,
  solverColor,
} from "@/lib/puzzleEngine";
import { useTranslation } from "@/hooks/useTranslation";

export interface PuzzleData {
  id: number;
  fen: string;
  solution_moves: string[];
  themes?: string[];
  difficulty?: string;
  rating?: number;
}

interface PuzzleBoardProps {
  puzzle: PuzzleData;
  onComplete: (moves: string[], wrong: boolean) => void;
  onWrong?: (played: string[]) => void;
  disabled?: boolean;
}

export function PuzzleBoard({ puzzle, onComplete, onWrong, disabled }: PuzzleBoardProps) {
  const { t } = useTranslation();
  const solution = puzzle.solution_moves ?? [];
  const [played, setPlayed] = useState<string[]>([]);
  const [fen, setFen] = useState(puzzle.fen);
  const [shake, setShake] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardNonce, setBoardNonce] = useState(0);

  useEffect(() => {
    setPlayed([]);
    setFen(puzzle.fen);
    setFeedback(null);
    setShake(false);
    setBoardNonce(0);
  }, [puzzle.id, puzzle.fen]);

  const orientation = useMemo(() => puzzleOrientation(puzzle.fen), [puzzle.fen]);
  const playerColor = solverColor(puzzle.fen);
  const lastMove = useMemo(() => {
    if (!played.length) return null;
    const uci = played[played.length - 1];
    return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  }, [played]);

  const handleMove = useCallback(
    (uci: string) => {
      if (disabled || !isPlayerTurn(puzzle.fen, played)) return;

      const result = applyPuzzleMove(puzzle.fen, solution, played, uci);

      if (result.wrong) {
        setShake(true);
        setFeedback(t("puzzles.wrongMove"));
        onWrong?.(played);
        setBoardNonce((n) => n + 1);
        setTimeout(() => setShake(false), 500);
        return;
      }

      setPlayed(result.moves);
      setFen(result.fen);
      setFeedback(null);

      if (result.complete) {
        setFeedback(t("puzzles.solved.correct"));
        onComplete(result.moves, false);
      }
    },
    [disabled, puzzle.fen, solution, played, onComplete, onWrong, t]
  );

  const progress = solution.length ? Math.round((played.length / solution.length) * 100) : 0;

  return (
    <div className={`space-y-2 ${shake ? "animate-pulse" : ""}`}>
      <div className="flex flex-wrap gap-2 items-center text-xs">
        {puzzle.rating != null && (
          <span className="px-2 py-0.5 rounded-full bg-white/10">{puzzle.rating}</span>
        )}
        {puzzle.themes?.map((th) => (
          <span key={th} className="px-2 py-0.5 rounded-full border border-africhess-gold/30 text-africhess-gold">
            {(() => {
              const key = `puzzles.theme.${th}`;
              const label = t(key);
              return label !== key ? label : th;
            })()}
          </span>
        ))}
        <span className="ml-auto opacity-50">{progress}%</span>
      </div>
      <p className="text-sm text-center text-africhess-gold">
        {playerColor === "w" ? t("puzzles.findWhiteMove") : t("puzzles.findBlackMove")}
      </p>
      <ChessBoard
        key={boardNonce}
        fen={fen}
        orientation={orientation}
        onMove={handleMove}
        playerColor={playerColor}
        disabled={disabled || !isPlayerTurn(puzzle.fen, played)}
        lastMove={lastMove}
        playSoundOnFenChange
        serverValidated
      />
      {feedback && (
        <p className={`text-sm text-center ${feedback.includes("!") ? "text-africhess-green" : "text-africhess-terracotta"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}

/** Réinitialise l'affichage sans recharger le puzzle parent */
export function usePuzzleResetKey(puzzleId: number) {
  return `puzzle-${puzzleId}-${Date.now()}`;
}

export { buildPuzzleFen };
