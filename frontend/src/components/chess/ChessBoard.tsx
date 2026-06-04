"use client";

import { useCallback, useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { motion } from "framer-motion";

interface ChessBoardProps {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (uci: string) => void;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
}

export function ChessBoard({
  fen = "start",
  orientation = "white",
  onMove,
  disabled = false,
  lastMove = null,
}: ChessBoardProps) {
  const [game, setGame] = useState(() => new Chess(fen === "start" ? undefined : fen));
  const [moveHighlight, setMoveHighlight] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    try {
      const g = new Chess(fen === "start" ? undefined : fen);
      setGame(g);
    } catch {
      /* invalid fen */
    }
  }, [fen]);

  useEffect(() => {
    if (lastMove) setMoveHighlight(lastMove);
  }, [lastMove]);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (disabled) return false;
      const g = new Chess(game.fen());
      const move = g.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      setGame(g);
      setMoveHighlight({ from: sourceSquare, to: targetSquare });
      onMove?.(`${sourceSquare}${targetSquare}${move.promotion || ""}`);
      return true;
    },
    [game, onMove, disabled]
  );

  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (moveHighlight) {
    customSquareStyles[moveHighlight.from] = { background: "rgba(212, 160, 23, 0.5)" };
    customSquareStyles[moveHighlight.to] = { background: "rgba(27, 122, 61, 0.5)" };
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[min(100%,560px)] aspect-square mx-auto rounded-xl overflow-hidden shadow-2xl ring-2 ring-africhess-gold/30"
    >
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        boardOrientation={orientation}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={{ backgroundColor: "#B58863" }}
        customLightSquareStyle={{ backgroundColor: "#F0D9B5" }}
        animationDuration={200}
        arePiecesDraggable={!disabled}
      />
    </motion.div>
  );
}
