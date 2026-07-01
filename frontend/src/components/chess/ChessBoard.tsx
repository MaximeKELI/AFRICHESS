"use client";

import { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Chessboard } from "react-chessboard";
import type { CustomSquareProps } from "react-chessboard/dist/chessboard/types";
import { Chess, Square } from "chess.js";
import { playChessSound, preloadChessSounds, soundForMove } from "@/lib/chessSounds";
import { accentRgba, getBoardTheme, getThemedSquareStyles, themeHasTexturedSquares } from "@/lib/boardThemes";
import { useAuthStore } from "@/store/auth";
import { customPiecesForSet } from "@/lib/pieceSets";
import { usePreferencesStore } from "@/store/preferences";
import { PromotionDialog } from "./PromotionDialog";
import { MoveClassPieceBadge } from "./MoveClassPieceBadge";
import { PuzzleHintArrow } from "@/components/puzzles/PuzzleHintArrow";
import { useTranslation } from "@/hooks/useTranslation";
import { useBoardSize, useCoarsePointer } from "@/hooks/useBoardSize";

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
  onPremove?: () => void;
  enablePremoves?: boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  playerColor?: "w" | "b";
  playSoundOnFenChange?: boolean;
  serverValidated?: boolean;
  pendingDrop?: string | null;
  onDropAtSquare?: (uci: string) => void;
  /** Espace sous le plateau (horloge joueur) pour le calcul responsive */
  extraBottom?: number;
  /** Surbrillance revue : coup joué (rouge) vs meilleur coup Stockfish (vert). */
  reviewHighlight?: {
    played?: { from: string; to: string };
    best?: { from: string; to: string };
  } | null;
  /** Badge de classification sur la pièce du coup analysé (revue Chess.com). */
  moveClassBadge?: { square: string; moveClass: string } | null;
  /** Flèche verte d'indice puzzle (from → to). */
  hintArrow?: { from: string; to: string } | null;
}

function normalizeFenForDisplay(fen: string): string {
  if (fen === "start") return fen;
  return fen.replace(/\[.*?\]/g, "");
}

function ChessBoardInner({
  fen = "start",
  orientation = "white",
  onMove,
  onMovePlayed,
  onPremove,
  enablePremoves = false,
  disabled = false,
  lastMove = null,
  playerColor,
  playSoundOnFenChange = true,
  serverValidated = false,
  pendingDrop = null,
  onDropAtSquare,
  extraBottom = 0,
  reviewHighlight = null,
  moveClassBadge = null,
  hintArrow = null,
}: ChessBoardProps) {
  const { t } = useTranslation();
  const { lowBandwidth } = useAuthStore();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const pieceSet = usePreferencesStore((s) => s.pieceSet);
  const customPieces = useMemo(() => customPiecesForSet(pieceSet), [pieceSet]);
  const theme = getBoardTheme(boardThemeId);
  const soundsOn = !lowBandwidth;
  const isCoarse = useCoarsePointer();
  const [game, setGame] = useState(() => new Chess(fen === "start" ? undefined : fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const prevPliesRef = useRef(0);
  const soundsReadyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardWidth = useBoardSize(containerRef, { extraBottom, min: 280, max: 820 });
  const [focusSquare, setFocusSquare] = useState<Square>("e4");
  const [boardStatus, setBoardStatus] = useState("");

  useEffect(() => {
    if (soundsOn && !soundsReadyRef.current) {
      preloadChessSounds();
      soundsReadyRef.current = true;
    }
  }, [soundsOn]);

  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);
  const pieceAnimMs = lowBandwidth ? 0 : isCoarse ? 80 : 120;
  const dotScale = boardWidth < 360 ? 0.24 : 0.18;

  const squareStyles = useMemo(() => {
    const textured = themeHasTexturedSquares(theme);
    const selected: React.CSSProperties = textured
      ? {
          boxShadow: `inset 0 0 0 3px ${accentRgba(theme.accent, 0.95)}, inset 0 0 16px ${accentRgba(theme.accent, 0.35)}`,
        }
      : {
          background: accentRgba(theme.accent, 0.55),
          boxShadow: `inset 0 0 0 3px ${accentRgba(theme.accent, 0.9)}`,
        };
    const lastFrom: React.CSSProperties = textured
      ? { boxShadow: `inset 0 0 14px ${theme.accentFrom}` }
      : { background: theme.accentFrom };
    const lastTo: React.CSSProperties = textured
      ? { boxShadow: `inset 0 0 0 3px ${accentRgba(theme.accent, 0.75)}` }
      : { background: accentRgba(theme.accent, 0.4) };
    const legalDot: React.CSSProperties = {
      background: `radial-gradient(circle, ${theme.legal} ${dotScale * 100}%, transparent ${dotScale * 100 + 1}%)`,
      backgroundSize: "100% 100%",
    };
    const captureRing: React.CSSProperties = {
      background: `radial-gradient(circle, transparent 58%, ${theme.capture} 59%, ${theme.capture} 70%, transparent 71%)`,
      backgroundSize: "100% 100%",
    };
    return { selected, lastFrom, lastTo, legalDot, captureRing };
  }, [theme, dotScale]);

  const displayFen = normalizeFenForDisplay(fen);

  useEffect(() => {
    try {
      const g = new Chess(displayFen === "start" ? undefined : displayFen);
      const plies = g.history().length;

      if (playSoundOnFenChange && plies > prevPliesRef.current && prevPliesRef.current > 0) {
        const last = g.history({ verbose: true }).at(-1);
        if (last) {
          playChessSound(soundForMove(last.flags, last.san), soundsOn);
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
  }, [displayFen, playSoundOnFenChange, soundsOn, onMovePlayed]);

  const turnColor = game.turn();

  useEffect(() => {
    if (game.isCheckmate()) {
      setBoardStatus("Échec et mat");
    } else if (game.inCheck()) {
      setBoardStatus("Échec");
    } else {
      setBoardStatus("");
    }
  }, [game]);

  const canSelectSquare = useCallback(
    (square: Square) => {
      if (disabled) return false;
      const piece = game.get(square);
      if (!piece) return false;
      if (playerColor) {
        if (piece.color !== playerColor) return false;
        if (enablePremoves && piece.color !== turnColor) return true;
        if (piece.color !== turnColor) return false;
        return true;
      }
      if (piece.color !== turnColor) return false;
      return true;
    },
    [disabled, game, playerColor, turnColor, enablePremoves]
  );

  const highlightTargets = useCallback(
    (from: Square) => {
      const moves = game.moves({ square: from, verbose: true });
      setLegalTargets(moves.map((m) => m.to as Square));
    },
    [game]
  );

  const applyMoveServer = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n"): boolean => {
      const uci = `${from}${to}${promotion || ""}`;
      setSelectedSquare(null);
      setLegalTargets([]);
      setPromotionPending(null);
      if (enablePremoves && playerColor && playerColor !== turnColor) {
        onPremove?.();
      }
      onMove?.(uci);
      return true;
    },
    [onMove, onPremove, enablePremoves, playerColor, turnColor]
  );

  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n"): boolean => {
      if (serverValidated) {
        const rank = to[1];
        const needsPromo =
          (from[1] === "7" && rank === "8") || (from[1] === "2" && rank === "1");
        if (needsPromo && !promotion) {
          setPromotionPending({ from, to });
          setSelectedSquare(null);
          setLegalTargets([]);
          return false;
        }
        return applyMoveServer(from, to, promotion);
      }
      const g = new Chess(game.fen());
      const legal = g.moves({ square: from, verbose: true });
      const targetMoves = legal.filter((m) => m.to === to);
      if (targetMoves.length === 0) return false;

      const needsPromo = targetMoves.some((m) => m.promotion);
      if (needsPromo && !promotion) {
        setPromotionPending({ from, to });
        setSelectedSquare(null);
        setLegalTargets([]);
        return false;
      }

      const move = g.move({
        from,
        to,
        promotion: promotion || (needsPromo ? "q" : undefined),
      });
      if (!move) return false;

      playChessSound(soundForMove(move.flags, move.san), soundsOn);

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
      setPromotionPending(null);
      onMove?.(uci);
      return true;
    },
    [game, onMove, onMovePlayed, soundsOn, serverValidated, applyMoveServer]
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (disabled) return;

      if (pendingDrop && onDropAtSquare) {
        onDropAtSquare(`${pendingDrop.toUpperCase()}@${square}`);
        return;
      }

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
    [disabled, selectedSquare, legalTargets, applyMove, canSelectSquare, highlightTargets, pendingDrop, onDropAtSquare]
  );

  const onDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (disabled) return false;
      return applyMove(sourceSquare, targetSquare);
    },
    [disabled, applyMove]
  );

  const onBoardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      const file = focusSquare.charCodeAt(0) - 97;
      const rank = parseInt(focusSquare[1], 10) - 1;

      if (e.key === "ArrowLeft" && file > 0) {
        e.preventDefault();
        setFocusSquare(`${String.fromCharCode(97 + file - 1)}${rank + 1}` as Square);
      } else if (e.key === "ArrowRight" && file < 7) {
        e.preventDefault();
        setFocusSquare(`${String.fromCharCode(97 + file + 1)}${rank + 1}` as Square);
      } else if (e.key === "ArrowUp" && rank < 7) {
        e.preventDefault();
        setFocusSquare(`${focusSquare[0]}${rank + 2}` as Square);
      } else if (e.key === "ArrowDown" && rank > 0) {
        e.preventDefault();
        setFocusSquare(`${focusSquare[0]}${rank}` as Square);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSquareClick(focusSquare);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedSquare(null);
        setLegalTargets([]);
      }
    },
    [disabled, focusSquare, onSquareClick]
  );

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove && !reviewHighlight?.played) {
      styles[lastMove.from] = { ...squareStyles.lastFrom };
      styles[lastMove.to] = { ...squareStyles.lastTo };
    }

    if (reviewHighlight?.best) {
      styles[reviewHighlight.best.from] = {
        ...styles[reviewHighlight.best.from],
        boxShadow: "inset 0 0 0 4px rgba(34, 197, 94, 0.9)",
      };
      styles[reviewHighlight.best.to] = {
        ...styles[reviewHighlight.best.to],
        background: "rgba(34, 197, 94, 0.38)",
      };
    }
    if (reviewHighlight?.played) {
      styles[reviewHighlight.played.from] = {
        ...styles[reviewHighlight.played.from],
        boxShadow: "inset 0 0 0 4px rgba(239, 68, 68, 0.85)",
      };
      styles[reviewHighlight.played.to] = {
        ...styles[reviewHighlight.played.to],
        background: "rgba(239, 68, 68, 0.35)",
      };
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

    if (!disabled && !isCoarse) {
      styles[focusSquare] = {
        ...styles[focusSquare],
        outline: `2px solid ${accentRgba(theme.accent, 0.9)}`,
        outlineOffset: "-2px",
      };
    }

    const kingDanger = lowBandwidth ? null : getKingDangerStyle(game);
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
  }, [lastMove, reviewHighlight, selectedSquare, legalTargets, game, squareStyles, lowBandwidth, focusSquare, disabled, theme.accent, isCoarse]);

  const notationStyle = useMemo(
    () => ({
      fontSize: Math.max(11, Math.round(boardWidth / 34)),
      fontWeight: 600 as const,
      opacity: 0.88,
    }),
    [boardWidth]
  );

  const boardStyle = useMemo(
    () => ({
      borderRadius: isCoarse ? 6 : 8,
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
    }),
    [isCoarse]
  );

  const reviewSquareRenderer = useMemo(() => {
    if (!moveClassBadge) return undefined;
    const badgeSquare = moveClassBadge.square;
    const moveClass = moveClassBadge.moveClass;
    return function ReviewSquare({ children, square, style }: CustomSquareProps) {
      return (
        <div style={{ ...style, position: "relative" }}>
          {children}
          {square === badgeSquare && <MoveClassPieceBadge moveClass={moveClass} />}
        </div>
      );
    };
  }, [moveClassBadge]);

  return (
    <div
      ref={containerRef}
      data-testid="chess-board"
      role="application"
      aria-label={t("chess.board.aria")}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onBoardKeyDown}
      className="chess-board-shell w-full min-w-0 mx-auto select-none"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className="chess-board-frame mx-auto rounded-lg overflow-hidden shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-africhess-gold relative"
        style={{
          width: boardWidth,
          height: boardWidth,
          maxWidth: "100%",
          ...(lowBandwidth
            ? undefined
            : theme.wood?.glossy
              ? {
                  boxShadow: `0 14px 48px -10px rgba(0,0,0,0.5), 0 0 0 2px ${accentRgba(theme.accent, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                }
              : {
                  boxShadow: `0 8px 24px -6px rgb(0 0 0 / 0.25), 0 0 0 1px ${accentRgba(theme.accent, 0.25)}`,
                }),
        }}
      >
        <Chessboard
          boardWidth={boardWidth}
          position={
            serverValidated
              ? displayFen === "start"
                ? "start"
                : displayFen
              : game.fen()
          }
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          boardOrientation={orientation}
          customSquareStyles={customSquareStyles}
          customDarkSquareStyle={squareBase.dark as Record<string, string>}
          customLightSquareStyle={squareBase.light as Record<string, string>}
          customBoardStyle={boardStyle}
          customNotationStyle={notationStyle}
          animationDuration={pieceAnimMs}
          arePiecesDraggable={!disabled}
          autoPromoteToQueen={false}
          showBoardNotation={true}
          snapToCursor={!isCoarse}
          {...(reviewSquareRenderer ? { customSquare: reviewSquareRenderer } : {})}
          {...(customPieces ? { customPieces } : {})}
        />
        {hintArrow && (
          <PuzzleHintArrow
            from={hintArrow.from}
            to={hintArrow.to}
            fen={displayFen}
            orientation={orientation}
          />
        )}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {boardStatus}
        {selectedSquare ? ` Case sélectionnée : ${selectedSquare}` : ""}
        {focusSquare ? ` Focus : ${focusSquare}` : ""}
      </p>
      {promotionPending && (
        <PromotionDialog
          color={game.turn()}
          onSelect={(piece) =>
            applyMove(promotionPending.from, promotionPending.to, piece)
          }
          onCancel={() => setPromotionPending(null)}
        />
      )}
    </div>
  );
}

export const ChessBoard = memo(ChessBoardInner);

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
