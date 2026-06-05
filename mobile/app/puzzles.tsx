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

type Tab = "daily" | "rush";

export default function PuzzlesScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [rushQueue, setRushQueue] = useState<Puzzle[]>([]);
  const [rushIndex, setRushIndex] = useState(0);
  const [rushScore, setRushScore] = useState(0);
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUciMoves([]);
    setResult(null);
    setStartTime(Date.now());
  };

  const loadDaily = useCallback(() => {
    setLoading(true);
    setError(null);
    reset();
    puzzlesApi
      .daily()
      .then(({ data }) => setPuzzle(data))
      .catch(() => {
        setPuzzle(null);
        setError("Impossible de charger le puzzle.");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadRush = useCallback(() => {
    if (!user) {
      setError("Connexion requise pour le Puzzle Rush.");
      return;
    }
    setLoading(true);
    setError(null);
    reset();
    setRushScore(0);
    setRushIndex(0);
    puzzlesApi
      .rush(10)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setRushQueue(list);
        setPuzzle(list[0] ?? null);
      })
      .catch(() => {
        setPuzzle(null);
        setError("Puzzle Rush indisponible (limite premium ?).");
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else loadRush();
  }, [tab, loadDaily, loadRush]);

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

  const submit = async () => {
    if (!puzzle || !user) return;
    setSubmitting(true);
    const time = Math.floor((Date.now() - startTime) / 1000);
    try {
      const { data } = await puzzlesApi.submit(puzzle.id, uciMoves, time);
      if (tab === "daily" && data.daily_streak != null) setStreak(data.daily_streak);
      const solved = data.solved;
      if (tab === "rush") {
        if (solved) setRushScore((s) => s + 1);
        setResult(solved ? "Correct !" : "Raté.");
        const next = rushIndex + 1;
        if (next < rushQueue.length) {
          setTimeout(() => {
            setRushIndex(next);
            setPuzzle(rushQueue[next]);
            reset();
          }, 600);
        } else {
          setResult(`Rush terminé — score : ${rushScore + (solved ? 1 : 0)}`);
        }
      } else {
        setResult(
          solved
            ? `Bravo !${data.daily_streak ? ` Série : ${data.daily_streak}j` : ""}`
            : "Ce n'est pas la bonne ligne."
        );
      }
    } catch {
      setResult("Validation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        {(["daily", "rush"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>
              {t === "daily" ? "Du jour" : "Rush"}
            </Text>
          </Pressable>
        ))}
      </View>

      {streak > 0 && tab === "daily" && (
        <Text style={styles.streak}>Série : {streak} jour{streak > 1 ? "s" : ""}</Text>
      )}
      {tab === "rush" && rushQueue.length > 0 && (
        <Text style={styles.streak}>
          {rushIndex + 1}/{rushQueue.length} · Score {rushScore}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 40 }} />
      ) : !puzzle ? (
        <View style={styles.centerBlock}>
          <Text style={styles.error}>{error ?? "Aucun puzzle."}</Text>
          <Pressable style={styles.btn} onPress={tab === "daily" ? loadDaily : loadRush}>
            <Text style={styles.btnText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.meta}>
            <Text style={styles.badge}>{puzzle.difficulty}</Text>
            <Text style={styles.badge}>ELO {puzzle.rating}</Text>
          </View>
          <ChessBoard
            fen={displayFen || puzzle.fen}
            orientation="white"
            lastMove={lastMove}
            onMove={handleMove}
            disabled={Boolean(result && tab === "daily")}
          />
          <View style={styles.actions}>
            <Pressable
              style={styles.btn}
              onPress={submit}
              disabled={submitting || !user || uciMoves.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{user ? "Valider" : "Connexion"}</Text>
              )}
            </Pressable>
            <Pressable style={[styles.btn, styles.btnOutline]} onPress={reset}>
              <Text style={styles.btnTextOutline}>Reset</Text>
            </Pressable>
          </View>
        </>
      )}

      {!user && (
        <Link href="/login" asChild>
          <Pressable style={styles.linkBtn}>
            <Text style={styles.linkText}>Se connecter</Text>
          </Pressable>
        </Link>
      )}
      {result && <Text style={styles.result}>{result}</Text>}
      {error && puzzle && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#0D1117", alignItems: "center", flexGrow: 1 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12, width: "100%" },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#1B7A3D", borderColor: "#D4A017" },
  tabText: { color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  streak: { color: "#1B7A3D", marginBottom: 12, fontSize: 14 },
  centerBlock: { alignItems: "center", marginTop: 40, gap: 12 },
  meta: { flexDirection: "row", gap: 8, marginBottom: 16 },
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
  btnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#D4A017" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnTextOutline: { color: "#D4A017", fontWeight: "600" },
  linkBtn: { marginTop: 16 },
  linkText: { color: "#D4A017", textAlign: "center" },
  result: { marginTop: 16, fontSize: 16, fontWeight: "600", color: "#fff", textAlign: "center" },
  error: { color: "#E07A5F", textAlign: "center", marginTop: 8 },
});
