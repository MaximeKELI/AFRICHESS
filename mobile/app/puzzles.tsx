import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChessBoard } from "../components/ChessBoard";
import { useAuth } from "../context/AuthContext";
import { type Puzzle, puzzlesApi } from "../lib/api";
import { buildFenFromUciMoves, lastMoveFromUci } from "../lib/puzzleDisplay";

export default function PuzzlesScreen() {
  const { user } = useAuth();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const loadDaily = useCallback(() => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUciMoves([]);
    setStartTime(Date.now());
    puzzlesApi
      .daily()
      .then(({ data }) => setPuzzle(data))
      .catch(() => {
        setPuzzle(null);
        setError("Impossible de charger le puzzle — vérifiez l'API.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  useEffect(() => {
    if (!user) return;
    puzzlesApi
      .streak()
      .then(({ data }) => setStreak(data.daily_streak ?? 0))
      .catch(() => setStreak(0));
  }, [user]);

  const displayFen = useMemo(() => {
    if (!puzzle) return "";
    return buildFenFromUciMoves(puzzle.fen, uciMoves);
  }, [puzzle, uciMoves]);

  const lastMove = useMemo(() => lastMoveFromUci(uciMoves), [uciMoves]);

  const handleMove = useCallback((uci: string) => {
    if (result) return;
    setUciMoves((prev) => [...prev, uci]);
  }, [result]);

  const reset = () => {
    setUciMoves([]);
    setResult(null);
    setStartTime(Date.now());
  };

  const submit = async () => {
    if (!puzzle || !user) return;
    setSubmitting(true);
    const time = Math.floor((Date.now() - startTime) / 1000);
    try {
      const { data } = await puzzlesApi.submit(puzzle.id, uciMoves, time);
      if (data.daily_streak != null) setStreak(data.daily_streak);
      setResult(
        data.solved
          ? `Bravo !${data.daily_streak ? ` Série : ${data.daily_streak} jours` : ""}`
          : "Ce n'est pas la bonne ligne. Réessayez."
      );
    } catch {
      setResult("Connexion requise pour valider le puzzle.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  if (!puzzle) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Aucun puzzle disponible."}</Text>
        <Pressable style={styles.btn} onPress={loadDaily}>
          <Text style={styles.btnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Puzzle du jour</Text>
      {streak > 0 && <Text style={styles.streak}>Série : {streak} jour{streak > 1 ? "s" : ""}</Text>}

      <View style={styles.meta}>
        <Text style={styles.badge}>{puzzle.difficulty}</Text>
        <Text style={styles.badge}>ELO {puzzle.rating}</Text>
        {puzzle.themes?.slice(0, 2).map((theme) => (
          <Text key={theme} style={styles.badge}>
            {theme}
          </Text>
        ))}
      </View>

      <ChessBoard
        fen={displayFen || puzzle.fen}
        orientation="white"
        lastMove={lastMove}
        onMove={handleMove}
        disabled={Boolean(result)}
      />

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={submit} disabled={submitting || !user || uciMoves.length === 0}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{user ? "Valider" : "Connexion requise"}</Text>
          )}
        </Pressable>
        <Pressable style={[styles.btn, styles.btnOutline]} onPress={reset}>
          <Text style={styles.btnTextOutline}>Réinitialiser</Text>
        </Pressable>
      </View>

      {!user && (
        <Link href="/login" asChild>
          <Pressable style={styles.linkBtn}>
            <Text style={styles.linkText}>Se connecter pour enregistrer votre score</Text>
          </Pressable>
        </Link>
      )}

      {result && <Text style={styles.result}>{result}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D1117",
    padding: 24,
  },
  container: {
    padding: 16,
    backgroundColor: "#0D1117",
    alignItems: "center",
    flexGrow: 1,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#D4A017", marginBottom: 4 },
  streak: { color: "#1B7A3D", marginBottom: 12, fontSize: 14 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16, justifyContent: "center" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(27, 122, 61, 0.25)",
    color: "#ccc",
    fontSize: 12,
    textTransform: "capitalize",
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 20, width: "100%" },
  btn: {
    flex: 1,
    backgroundColor: "#1B7A3D",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D4A017",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnTextOutline: { color: "#D4A017", fontWeight: "600" },
  linkBtn: { marginTop: 16 },
  linkText: { color: "#D4A017", textAlign: "center" },
  result: { marginTop: 16, fontSize: 16, fontWeight: "600", color: "#fff", textAlign: "center" },
  error: { color: "#E07A5F", textAlign: "center", marginTop: 8 },
});
