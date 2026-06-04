"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { playChessSound, preloadChessSounds, soundForMove } from "@/lib/chessSounds";
import { accentRgba, getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { useAuthStore } from "@/store/auth";
import { usePreferencesStore } from "@/store/preferences";

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
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const soundsOn = !lowBandwidth;
  const [game, setGame] = useState(() => new Chess(fen === "start" ? undefined : fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const prevPliesRef = useRef(0);

  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const squareStyles = useMemo(() => {
    const floral = Boolean(theme.floral);
    const selected: React.CSSProperties = floral
      ? {
          boxShadow: `inset 0 0 0 3px ${accentRgba(theme.accent, 0.95)}, inset 0 0 16px ${accentRgba(theme.accent, 0.35)}`,
        }
      : {
          background: accentRgba(theme.accent, 0.55),
          boxShadow: `inset 0 0 0 3px ${accentRgba(theme.accent, 0.9)}`,
        };
    const lastFrom: React.CSSProperties = floral
      ? { boxShadow: `inset 0 0 14px ${theme.accentFrom}` }
      : { background: theme.accentFrom };
    const lastTo: React.CSSProperties = floral
      ? { boxShadow: `inset 0 0 0 3px ${accentRgba(theme.accent, 0.75)}` }
      : { background: accentRgba(theme.accent, 0.4) };
    const legalDot: React.CSSProperties = {
      background: `radial-gradient(circle, ${theme.legal} 18%, transparent 19%)`,
      backgroundSize: "100% 100%",
    };
    const captureRing: React.CSSProperties = {
      background: `radial-gradient(circle, transparent 60%, ${theme.capture} 61%, ${theme.capture} 68%, transparent 69%)`,
      backgroundSize: "100% 100%",
    };
    return { selected, lastFrom, lastTo, legalDot, captureRing };
  }, [theme, theme.floral]);

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
      preloadChessSounds();
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
      preloadChessSounds();
      if (disabled) return false;
      return applyMove(sourceSquare, targetSquare);
    },
    [disabled, applyMove]
  );

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { ...squareStyles.lastFrom };
      styles[lastMove.to] = { ...squareStyles.lastTo };
    }

    if (selectedSquare) {
      styles[selectedSquare] = { ...squareStyles.selected };
    }

    for (const target of legalTargets) {
      const pieceOnTarget = game.get(target);
      styles[target] = pieceOnTarget
        ? { ...squareStyles.captureRing }
        : { ...squareStyles.legalDot };
    }

    const kingDanger = getKingDangerStyle(game);
    if (kingDanger) {
      const kingSquare = findKingSquare(game, game.turn());
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          ...kingDanger,
        };
      }
    }

    return styles;
  }, [lastMove, selectedSquare, legalTargets, game, squareStyles]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[min(100%,560px)] aspect-square mx-auto rounded-xl overflow-hidden shadow-2xl"
      style={{ boxShadow: `0 25px 50px -12px rgb(0 0 0 / 0.25), 0 0 0 2px ${accentRgba(theme.accent, 0.4)}` }}
    >
      <Chessboard
        key={boardThemeId}
        position={game.fen()}
        onPieceDrop={onDrop}
        onSquareClick={onSquareClick}
        boardOrientation={orientation}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={squareBase.dark as Record<string, string>}
        customLightSquareStyle={squareBase.light as Record<string, string>}
        animationDuration={200}
        arePiecesDraggable={!disabled}
      />
    </motion.div>
  );
}

/** Rouge sang sur la case du roi en échec ou mat. */
function getKingDangerStyle(chess: Chess): React.CSSProperties | null {
  if (!chess.inCheck()) return null;

  const base: React.CSSProperties = {
    backgroundImage: "none",
    backgroundSize: "unset",
    backgroundRepeat: "unset",
  };

  if (chess.isCheckmate()) {
    return {
      ...base,
      backgroundColor: "rgba(69, 10, 10, 0.95)",
      boxShadow:
        "inset 0 0 0 4px #450a0a, inset 0 0 36px rgba(127, 29, 29, 0.95), 0 0 12px rgba(220, 38, 38, 0.5)",
      animation: "king-mate-blood 0.9s ease-in-out infinite",
    };
  }

  return {
    ...base,
    backgroundColor: "rgba(127, 29, 29, 0.88)",
    boxShadow:
      "inset 0 0 0 3px #991b1b, inset 0 0 24px rgba(153, 27, 27, 0.75)",
    animation: "king-check-blood 1.1s ease-in-out infinite",
  };
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
