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
  /** Si omis, le joueur peut déplacer le camp dont c'est le trait (puzzles). */
  playerColor?: "w" | "b" | null;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  /** Variantes 960 / Crazyhouse : validation serveur uniquement */
  serverValidated?: boolean;
  /** Crazyhouse : pièce sélectionnée pour drop */
  pendingDrop?: string | null;
  onDropAtSquare?: (uci: string) => void;
  onMove: (uci: string) => void;
}

function toChessFen(fen: string): string | undefined {
  if (!fen || fen === "start") return undefined;
  return fen.replace(/\[.*?\]/g, "");
}

export function ChessBoard({
  fen,
  orientation = "white",
  playerColor = null,
  disabled = false,
  lastMove = null,
  serverValidated = false,
  pendingDrop = null,
  onDropAtSquare,
  onMove,
}: ChessBoardProps) {
  const boardSize = Dimensions.get("window").width - 32;
  const squareSize = boardSize / 8;

  const [game, setGame] = useState(() => new Chess(toChessFen(fen)));
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);

  useEffect(() => {
    try {
      const g = new Chess(toChessFen(fen));
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
      const turn = game.turn();
      if (playerColor) {
        if (p.color !== playerColor || turn !== playerColor) return false;
      } else if (p.color !== turn) {
        return false;
      }
      return true;
    },
    [disabled, game, playerColor]
  );

  const sendUci = useCallback(
    (from: Square, to: Square) => {
      const rank = to[1];
      const needsPromo =
        serverValidated &&
        ((from[1] === "7" && rank === "8") || (from[1] === "2" && rank === "1"));
      const uci = `${from}${to}${needsPromo ? "q" : ""}`;
      setSelected(null);
      setTargets([]);
      onMove(uci);
      return true;
    },
    [onMove, serverValidated]
  );

  const tryMove = useCallback(
    (from: Square, to: Square) => {
      if (serverValidated) return sendUci(from, to);
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
    [game, onMove, serverValidated, sendUci]
  );

  const highlightTargets = useCallback(
    (from: Square) => {
      if (serverValidated) {
        const squares: Square[] = [];
        for (let f = 0; f < 8; f++) {
          for (let r = 1; r <= 8; r++) {
            const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
            if (sq !== from) squares.push(sq);
          }
        }
        setTargets(squares);
        return;
      }
      const moves = game.moves({ square: from, verbose: true });
      setTargets(moves.map((m) => m.to as Square));
    },
    [game, serverValidated]
  );

  const onSquarePress = useCallback(
    (sq: Square) => {
      if (disabled) return;

      if (pendingDrop && onDropAtSquare) {
        onDropAtSquare(`${pendingDrop.toUpperCase()}@${sq}`);
        setSelected(null);
        setTargets([]);
        return;
      }

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
        setSelected(sq);
        highlightTargets(sq);
        return;
      }
      setSelected(null);
      setTargets([]);
    },
    [disabled, selected, targets, tryMove, canSelect, highlightTargets, pendingDrop, onDropAtSquare]
  );

  const displayFen = serverValidated ? toChessFen(fen) : game.fen();
  const displayGame = useMemo(() => {
    try {
      return new Chess(displayFen);
    } catch {
      return game;
    }
  }, [displayFen, game]);

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {ranks.map((rank, ri) =>
        files.map((file, fi) => {
          const sq = `${file}${rank}` as Square;
          const fileIndex = FILES.indexOf(file);
          const isLight = (rank + fileIndex) % 2 === 0;
          const piece = (serverValidated ? displayGame : game).get(sq);
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
