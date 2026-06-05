import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatClock } from "../lib/clock";

interface GameClockProps {
  whiteMs: number;
  blackMs: number;
  turn: "w" | "b";
  running: boolean;
  orientation: "white" | "black";
  incrementMs?: number;
}

function ClockRow({
  ms,
  active,
  label,
  running,
}: {
  ms: number;
  active: boolean;
  label: string;
  running: boolean;
}) {
  const low = ms < 10_000 && running && active;
  return (
    <View style={[styles.row, active && running && styles.rowActive]}>
      <Text style={styles.side}>{label}</Text>
      <Text style={[styles.time, low && styles.timeLow]}>{formatClock(ms)}</Text>
    </View>
  );
}

export function GameClock({
  whiteMs,
  blackMs,
  turn,
  running,
  orientation,
  incrementMs = 0,
}: GameClockProps) {
  const [white, setWhite] = useState(whiteMs);
  const [black, setBlack] = useState(blackMs);
  const turnRef = useRef(turn);

  useEffect(() => {
    setWhite(whiteMs);
    setBlack(blackMs);
  }, [whiteMs, blackMs]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (turnRef.current === "w") {
        setWhite((t) => Math.max(0, t - 250));
      } else {
        setBlack((t) => Math.max(0, t - 250));
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const topIsWhite = orientation === "black";
  const topMs = topIsWhite ? white : black;
  const bottomMs = topIsWhite ? black : white;
  const topTurn = topIsWhite ? turn === "w" : turn === "b";

  return (
    <View style={styles.wrap}>
      {incrementMs > 0 && (
        <Text style={styles.inc}>+{incrementMs / 1000}s par coup</Text>
      )}
      <ClockRow
        ms={topMs}
        active={topTurn}
        label={topIsWhite ? "Blancs" : "Noirs"}
        running={running}
      />
      <ClockRow
        ms={bottomMs}
        active={!topTurn}
        label={topIsWhite ? "Noirs" : "Blancs"}
        running={running}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 6, marginBottom: 12 },
  inc: { textAlign: "center", color: "#666", fontSize: 11 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  rowActive: {
    backgroundColor: "rgba(212, 160, 23, 0.2)",
    borderWidth: 2,
    borderColor: "#D4A017",
  },
  side: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  time: { color: "#fff", fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
  timeLow: { color: "#E07A5F" },
});
