import { Pressable, StyleSheet, Text, View } from "react-native";
import { pieceSymbol } from "../lib/pieces";

const PIECE_TYPE: Record<string, string> = {
  P: "p",
  N: "n",
  B: "b",
  R: "r",
  Q: "q",
  p: "p",
  n: "n",
  b: "b",
  r: "r",
  q: "q",
};

interface PocketBarProps {
  pieces: string[];
  selected: string | null;
  onSelect: (piece: string | null) => void;
  disabled?: boolean;
}

export function PocketBar({ pieces, selected, onSelect, disabled }: PocketBarProps) {
  if (pieces.length === 0) {
    return <Text style={styles.empty}>Réserve vide</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Réserve</Text>
      {pieces.map((p, i) => {
        const isWhite = p === p.toUpperCase();
        const type = PIECE_TYPE[p] ?? "p";
        const color = isWhite ? "w" : "b";
        return (
          <Pressable
            key={`${p}-${i}`}
            disabled={disabled}
            onPress={() => onSelect(selected === p ? null : p)}
            style={[styles.pieceBtn, selected === p && styles.pieceBtnActive]}
          >
            <Text style={styles.piece}>{pieceSymbol(color, type)}</Text>
          </Pressable>
        );
      })}
      {selected && (
        <Pressable onPress={() => onSelect(null)}>
          <Text style={styles.cancel}>Annuler drop</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 10,
    width: "100%",
  },
  label: { fontSize: 10, color: "#666", textTransform: "uppercase", marginRight: 4 },
  empty: { fontSize: 12, color: "#666", textAlign: "center", marginVertical: 8 },
  pieceBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161B22",
  },
  pieceBtnActive: {
    borderColor: "#D4A017",
    backgroundColor: "rgba(212, 160, 23, 0.2)",
  },
  piece: { fontSize: 24 },
  cancel: { color: "#D4A017", fontSize: 12, marginLeft: 8 },
});
