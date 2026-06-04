"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";

interface ChessBoardProps {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (uci: string) => void;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  /** Whose turn it is — only that side's pieces can be selected */
  playerColor?: "w" | "b";
}

const SELECTED_STYLE: React.CSSProperties = {
  background: "rgba(212, 160, 23, 0.55)",
  boxShadow: "inset 0 0 0 3px rgba(212, 160, 23, 0.9)",
};

const LAST_MOVE_FROM: React.CSSProperties = {
  background: "rgba(212, 160, 23, 0.35)",
};

const LAST_MOVE_TO: React.CSSProperties = {
  background: "rgba(27, 122, 61, 0.4)",
};

const LEGAL_MOVE_DOT: React.CSSProperties = {
  background:
    "radial-gradient(circle, rgba(27, 122, 61, 0.85) 18%, transparent 19%)",
  backgroundSize: "100% 100%",
};

const LEGAL_CAPTURE_RING: React.CSSProperties = {
  background:
    "radial-gradient(circle, transparent 60%, rgba(196, 92, 38, 0.75) 61%, rgba(196, 92, 38, 0.75) 68%, transparent 69%)",
  backgroundSize: "100% 100%",
};

export function ChessBoard({
  fen = "start",
  orientation = "white",
  onMove,
  disabled = false,
  lastMove = null,
  playerColor,
}: ChessBoardProps) {
  const [game, setGame] = useState(() => new Chess(fen === "start" ? undefined : fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);

  useEffect(() => {
    try {
      const g = new Chess(fen === "start" ? undefined : fen);
      setGame(g);
      setSelectedSquare(null);
      setLegalTargets([]);
    } catch {
      /* invalid fen */
    }
  }, [fen]);

  const turnColor = game.turn();

  const canSelectSquare = useCallback(
    (square: Square) => {
      if (disabled) return false;
      if (playerColor && game.get(square)?.color !== playerColor) return false;
      if (!playerColor && game.get(square)?.color !== turnColor) return false;
      return Boolean(game.get(square));
    },
    [disabled, game, playerColor, turnColor]
  );

  const highlightTargets = useCallback((from: Square) => {
    const moves = game.moves({ square: from, verbose: true });
    setLegalTargets(moves.map((m) => m.to as Square));
  }, [game]);

  const applyMove = useCallback(
    (from: Square, to: Square): boolean => {
      const g = new Chess(game.fen());
      const move = g.move({ from, to, promotion: "q" });
      if (!move) return false;
      setGame(g);
      setSelectedSquare(null);
      setLegalTargets([]);
      onMove?.(`${from}${to}${move.promotion || ""}`);
      return true;
    },
    [game, onMove]
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (disabled) return;

      if (selectedSquare && legalTargets.includes(square)) {
        applyMove(selectedSquare, square);
        return;
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      if (canSelectSquare(square)) {
        setSelectedSquare(square);
        highlightTargets(square);
        return;
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    },
    [disabled, selectedSquare, legalTargets, applyMove, canSelectSquare, highlightTargets]
  );

  const onDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (disabled) return false;
      const ok = applyMove(sourceSquare, targetSquare);
      return ok;
    },
    [disabled, applyMove]
  );

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { ...LAST_MOVE_FROM };
      styles[lastMove.to] = { ...LAST_MOVE_TO };
    }

    if (selectedSquare) {
      styles[selectedSquare] = { ...SELECTED_STYLE };
    }

    for (const target of legalTargets) {
      const pieceOnTarget = game.get(target);
      styles[target] = pieceOnTarget
        ? { ...LEGAL_CAPTURE_RING }
        : { ...LEGAL_MOVE_DOT };
    }

    return styles;
  }, [lastMove, selectedSquare, legalTargets, game]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[min(100%,560px)] aspect-square mx-auto rounded-xl overflow-hidden shadow-2xl ring-2 ring-africhess-gold/30"
    >
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        onSquareClick={onSquareClick}
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
