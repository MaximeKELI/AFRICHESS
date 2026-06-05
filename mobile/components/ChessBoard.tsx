import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { pieceSymbol } from "../lib/pieces";

const LIGHT = "#E8D5B5";
const DARK = "#1B5E3B";
const SELECT = "rgba(212, 160, 23, 0.55)";
const LAST = "rgba(212, 160, 23, 0.35)";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface ChessBoardProps {
  fen: string;
  orientation?: "white" | "black";
  playerColor?: "w" | "b";
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove: (uci: string) => void;
}

function normalizeFen(fen: string): string {
  return fen.replace(/\[.*?\]/g, "");
}

export function ChessBoard({
  fen,
  orientation = "white",
  playerColor = "w",
  disabled = false,
  lastMove = null,
  onMove,
}: ChessBoardProps) {
  const boardSize = Dimensions.get("window").width - 32;
  const squareSize = boardSize / 8;

  const [game, setGame] = useState(() => new Chess(normalizeFen(fen === "start" ? undefined : fen)));
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);

  useEffect(() => {
    try {
      const g = new Chess(normalizeFen(fen === "start" ? undefined : fen));
      setGame(g);
      setSelected(null);
      setTargets([]);
    } catch {
      /* keep previous */
    }
  }, [fen]);

  const ranks = useMemo(
    () => (orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]),
    [orientation]
  );
  const files = useMemo(
    () => (orientation === "white" ? FILES : [...FILES].reverse()),
    [orientation]
  );

  const canSelect = useCallback(
    (sq: Square) => {
      if (disabled) return false;
      const p = game.get(sq);
      if (!p) return false;
      if (p.color !== playerColor) return false;
      if (game.turn() !== playerColor) return false;
      return true;
    },
    [disabled, game, playerColor]
  );

  const tryMove = useCallback(
    (from: Square, to: Square) => {
      const g = new Chess(game.fen());
      const legal = g.moves({ square: from, verbose: true }).filter((m) => m.to === to);
      if (legal.length === 0) return false;
      const needsPromo = legal.some((m) => m.promotion);
      const move = g.move({
        from,
        to,
        promotion: needsPromo ? "q" : undefined,
      });
      if (!move) return false;
      const uci = `${from}${to}${move.promotion || ""}`;
      setSelected(null);
      setTargets([]);
      onMove(uci);
      return true;
    },
    [game, onMove]
  );

  const onSquarePress = useCallback(
    (sq: Square) => {
      if (disabled) return;
      if (selected && targets.includes(sq)) {
        tryMove(selected, sq);
        return;
      }
      if (selected === sq) {
        setSelected(null);
        setTargets([]);
        return;
      }
      if (canSelect(sq)) {
        const moves = game.moves({ square: sq, verbose: true });
        setSelected(sq);
        setTargets(moves.map((m) => m.to as Square));
        return;
      }
      setSelected(null);
      setTargets([]);
    },
    [disabled, selected, targets, tryMove, canSelect, game]
  );

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {ranks.map((rank, ri) =>
        files.map((file, fi) => {
          const sq = `${file}${rank}` as Square;
          const fileIndex = FILES.indexOf(file);
          const isLight = (rank + fileIndex) % 2 === 0;
          const piece = game.get(sq);
          const isSelected = selected === sq;
          const isTarget = targets.includes(sq);
          const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);

          return (
            <Pressable
              key={sq}
              onPress={() => onSquarePress(sq)}
              style={[
                styles.square,
                {
                  width: squareSize,
                  height: squareSize,
                  left: fi * squareSize,
                  top: ri * squareSize,
                  backgroundColor: isLight ? LIGHT : DARK,
                },
                isLast && styles.lastMove,
                isSelected && styles.selected,
                isTarget && styles.target,
              ]}
            >
              {piece && (
                <Text
                  style={[
                    styles.piece,
                    { fontSize: squareSize * 0.62 },
                    piece.color === "w" ? styles.whitePiece : styles.blackPiece,
                  ]}
                >
                  {pieceSymbol(piece.color, piece.type)}
                </Text>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#D4A017",
  },
  square: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  piece: {
    fontWeight: "400",
    textAlign: "center",
  },
  whitePiece: {
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: "#111",
  },
  selected: {
    backgroundColor: SELECT,
  },
  target: {
    borderWidth: 2,
    borderColor: "rgba(212, 160, 23, 0.8)",
  },
  lastMove: {
    backgroundColor: LAST,
  },
});
