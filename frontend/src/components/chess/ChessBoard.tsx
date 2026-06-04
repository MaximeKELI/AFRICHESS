"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { playChessSound, soundForMove } from "@/lib/chessSounds";
import { useAuthStore } from "@/store/auth";

export interface MoveInfo {
  uci: string;
  san: string;
  from: string;
  to: string;
  flags: string;
}

interface ChessBoardProps {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (uci: string) => void;
  onMovePlayed?: (info: MoveInfo) => void;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  playerColor?: "w" | "b";
  /** Jouer le son pour les coups adverses quand le FEN change (réponse serveur) */
  playSoundOnFenChange?: boolean;
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
  onMovePlayed,
  disabled = false,
  lastMove = null,
  playerColor,
  playSoundOnFenChange = true,
}: ChessBoardProps) {
  const { lowBandwidth } = useAuthStore();
  const soundsOn = !lowBandwidth;
  const [game, setGame] = useState(() => new Chess(fen === "start" ? undefined : fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const prevPliesRef = useRef(0);

  useEffect(() => {
    try {
      const g = new Chess(fen === "start" ? undefined : fen);
      const plies = g.history().length;

      if (playSoundOnFenChange && plies > prevPliesRef.current && prevPliesRef.current > 0) {
        const last = g.history({ verbose: true }).at(-1);
        if (last) {
          playChessSound(soundForMove(last.flags), soundsOn);
          onMovePlayed?.({
            uci: `${last.from}${last.to}${last.promotion || ""}`,
            san: last.san,
            from: last.from,
            to: last.to,
            flags: last.flags,
          });
        }
      }

      prevPliesRef.current = plies;
      setGame(g);
      setSelectedSquare(null);
      setLegalTargets([]);
    } catch {
      /* invalid fen */
    }
  }, [fen, playSoundOnFenChange, soundsOn, onMovePlayed]);

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

      playChessSound(soundForMove(move.flags), soundsOn);

      const uci = `${from}${to}${move.promotion || ""}`;
      onMovePlayed?.({
        uci,
        san: move.san,
        from: move.from,
        to: move.to,
        flags: move.flags,
      });

      setGame(g);
      prevPliesRef.current = g.history().length;
      setSelectedSquare(null);
      setLegalTargets([]);
      onMove?.(uci);
      return true;
    },
    [game, onMove, onMovePlayed, soundsOn]
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
      return applyMove(sourceSquare, targetSquare);
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

    if (game.inCheck()) {
      const kingSquare = findKingSquare(game, game.turn());
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          boxShadow: "inset 0 0 0 3px rgba(196, 40, 40, 0.85)",
        };
      }
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

function findKingSquare(chess: Chess, color: "w" | "b"): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) {
        const file = String.fromCharCode(97 + c);
        const rank = String(8 - r);
        return `${file}${rank}` as Square;
      }
    }
  }
  return null;
}
