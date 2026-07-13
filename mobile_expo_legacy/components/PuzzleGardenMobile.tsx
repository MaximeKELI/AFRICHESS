import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../context/LocaleContext";

interface PuzzleGardenMobileProps {
  visible: boolean;
  current: number;
  total?: number;
  streak?: number;
  xpGained?: number;
  onDone?: () => void;
}

/** Overlay jardin simplifié pour mobile (daily résolu). */
export function PuzzleGardenMobile({
  visible,
  current,
  total,
  streak,
  xpGained,
  onDone,
}: PuzzleGardenMobileProps) {
  const { t } = useTranslation();
  const fade = useRef(new Animated.Value(0)).current;
  const pawnY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    pawnY.setValue(0);
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(pawnY, { toValue: -28, duration: 700, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, [visible, fade, pawnY, onDone]);

  if (!visible) return null;

  const progress = total && total > 1 ? `${current}/${total}` : String(current);

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]} pointerEvents="none">
      <View style={styles.sky} />
      <View style={styles.grass} />
      <Text style={styles.title}>{t("puzzles.celebrate.daily")}</Text>
      <Animated.Text style={[styles.pawn, { transform: [{ translateY: pawnY }] }]}>♙</Animated.Text>
      <Text style={styles.progress}>{progress}</Text>
      <Text style={styles.label}>{t("puzzles.celebrate.progress")}</Text>
      {xpGained != null && xpGained > 0 && (
        <Text style={styles.xp}>+{xpGained} XP</Text>
      )}
      {streak != null && streak > 0 && (
        <Text style={styles.streak}>{t("puzzles.celebrate.streak", { n: streak })}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2d6a8f",
  },
  grass: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "35%",
    backgroundColor: "#1b4d28",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    zIndex: 2,
  },
  pawn: {
    fontSize: 48,
    color: "#f5f0e6",
    zIndex: 2,
  },
  progress: {
    fontSize: 32,
    fontWeight: "800",
    color: "#D4A017",
    marginTop: 8,
    zIndex: 2,
  },
  label: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 1,
    zIndex: 2,
  },
  xp: {
    marginTop: 6,
    color: "#67e8f9",
    fontWeight: "700",
    fontSize: 14,
    zIndex: 2,
  },
  streak: {
    marginTop: 4,
    color: "#ffd54a",
    fontSize: 13,
    zIndex: 2,
  },
});
