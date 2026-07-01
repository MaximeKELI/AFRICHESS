import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PuzzleGardenMobile } from "../components/PuzzleGardenMobile";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { type Puzzle, puzzlesApi } from "../lib/api";
import { buildFenFromUciMoves, lastMoveFromUci } from "../lib/puzzleDisplay";
import { applyPuzzleMove } from "../lib/puzzleEngine";
import { playPuzzleSuccess, playPuzzleWrong } from "../lib/puzzleSounds";

type Tab = "daily" | "rush";

export default function PuzzlesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [rushSessionId, setRushSessionId] = useState<number | null>(null);
  const [rushScore, setRushScore] = useState(0);
  const [rushMisses, setRushMisses] = useState(0);
  const [rushTimeLeft, setRushTimeLeft] = useState(180);
  const [rushIndex, setRushIndex] = useState(0);
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [gardenVisible, setGardenVisible] = useState(false);
  const [lastXp, setLastXp] = useState<number | undefined>();

  const reset = () => {
    setUciMoves([]);
    setResult(null);
    setPuzzleFailed(false);
    setPuzzleSolved(false);
    setStartTime(Date.now());
  };

  const retryPuzzle = () => {
    reset();
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
        setError(t("puzzles.error.load"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const loadRush = useCallback(() => {
    if (!user) {
      setError(t("puzzles.error.rushLogin"));
      return;
    }
    setLoading(true);
    setError(null);
    reset();
    setRushScore(0);
    setRushMisses(0);
    setRushIndex(0);
    setRushSessionId(null);
    setRushTimeLeft(180);
    puzzlesApi
      .rushStart()
      .then(({ data }) => {
        setRushSessionId(data.session_id);
        setRushTimeLeft(data.duration ?? 180);
        setPuzzle(data.puzzle);
        setRushIndex(1);
      })
      .catch(() => {
        setPuzzle(null);
        setError(t("puzzles.error.rushLimit"));
      })
      .finally(() => setLoading(false));
  }, [user, t]);

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

  useEffect(() => {
    if (tab !== "rush" || !rushSessionId || rushTimeLeft <= 0) return;
    const id = setInterval(() => {
      setRushTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [tab, rushSessionId, rushTimeLeft]);

  const displayFen = useMemo(() => {
    if (!puzzle) return "";
    return buildFenFromUciMoves(puzzle.fen, uciMoves);
  }, [puzzle, uciMoves]);

  const lastMove = useMemo(() => lastMoveFromUci(uciMoves), [uciMoves]);

  const submitWithMoves = useCallback(
    async (moves: string[]) => {
      if (!puzzle || !user) return;
      setSubmitting(true);
      const time = Math.floor((Date.now() - startTime) / 1000);
      try {
        if (tab === "rush" && rushSessionId) {
          const { data } = await puzzlesApi.rushSubmit(rushSessionId, moves, time);
          setRushScore(data.score ?? rushScore);
          setRushMisses(data.misses ?? rushMisses);
          if (data.time_left != null) setRushTimeLeft(data.time_left);
          const solved = Boolean(data.solved);
          if (data.completed) {
            const score = data.score ?? rushScore;
            const msg =
              data.reason === "timeout"
                ? t("puzzles.rush.timeout", { score })
                : (data.misses ?? rushMisses) >= 3
                  ? t("puzzles.rush.threeMisses", { score })
                  : t("puzzles.rush.done", { score });
            setResult(msg);
            setPuzzle(null);
            setRushSessionId(null);
            return;
          }
          setResult(solved ? t("puzzles.correct") : t("puzzles.wrong"));
          if (solved) playPuzzleSuccess();
          else playPuzzleWrong();
          if (!solved) setPuzzleFailed(true);
          if (data.next_puzzle) {
            setRushIndex((i) => i + 1);
            setTimeout(() => {
              setPuzzle(data.next_puzzle!);
              reset();
            }, 600);
          }
        } else {
          const { data } = await puzzlesApi.submit(puzzle.id, moves, time);
          if (data.daily_streak != null) setStreak(data.daily_streak);
          const solved = data.solved;
          if (solved) {
            setPuzzleSolved(true);
            setResult(t("puzzles.bravo", { streak: data.daily_streak ?? streak }));
            playPuzzleSuccess();
          } else {
            setPuzzleFailed(true);
            setResult(t("puzzles.wrongLine"));
            playPuzzleWrong();
          }
        }
      } catch {
        setResult(t("puzzles.submitError"));
      } finally {
        setSubmitting(false);
      }
    },
    [puzzle, user, startTime, tab, rushSessionId, rushScore, rushMisses, streak, t]
  );

  const submitRef = useRef(submitWithMoves);
  submitRef.current = submitWithMoves;

  const handleMove = useCallback(
    (uci: string) => {
      if (!puzzle || puzzleFailed || puzzleSolved) return;
      const solution = puzzle.solution_moves ?? [];
      const outcome = applyPuzzleMove(puzzle.fen, solution, uciMoves, uci);
      if (outcome.wrong) {
        setPuzzleFailed(true);
        setResult(t("puzzles.wrongLine"));
        playPuzzleWrong();
        return;
      }
      setUciMoves(outcome.moves);
      if (outcome.complete && user) {
        void submitRef.current(outcome.moves);
      }
    },
    [puzzle, puzzleFailed, puzzleSolved, uciMoves, user, t]
  );

  const submit = async () => {
    if (!puzzle || !user || uciMoves.length === 0) return;
    await submitWithMoves(uciMoves);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        {(["daily", "rush"] as const).map((tabKey) => (
          <Pressable
            key={tabKey}
            onPress={() => setTab(tabKey)}
            style={[styles.tab, tab === tabKey && styles.tabActive]}
          >
            <Text style={tab === tabKey ? styles.tabTextActive : styles.tabText}>
              {t(`puzzles.tab.${tabKey}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {streak > 0 && tab === "daily" && (
        <Text style={styles.streak}>{t("puzzles.streak", { count: streak })}</Text>
      )}
      {tab === "rush" && rushSessionId && (
        <>
          <Text style={styles.streak}>
            {t("puzzles.rush.progress", {
              current: `#${rushIndex}`,
              score: rushScore,
              time: rushTimeLeft,
            })}
          </Text>
          <Text style={styles.streak}>{t("puzzles.rush.misses", { count: rushMisses })}</Text>
        </>
      )}

      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 40 }} />
      ) : !puzzle ? (
        <View style={styles.centerBlock}>
          <Text style={styles.error}>{error ?? t("puzzles.none")}</Text>
          <Pressable style={styles.btn} onPress={tab === "daily" ? loadDaily : loadRush}>
            <Text style={styles.btnText}>{t("puzzles.retry")}</Text>
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
            disabled={puzzleFailed || puzzleSolved}
          />
          <View style={styles.actions}>
            {puzzleFailed && tab === "daily" ? (
              <Pressable style={styles.btn} onPress={retryPuzzle}>
                <Text style={styles.btnText}>{t("puzzles.retry")}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.btn}
                onPress={submit}
                disabled={submitting || !user || uciMoves.length === 0 || puzzleSolved}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>{user ? t("puzzles.validate") : t("app.login")}</Text>
                )}
              </Pressable>
            )}
            <Pressable style={[styles.btn, styles.btnOutline]} onPress={reset}>
              <Text style={styles.btnTextOutline}>{t("puzzles.reset")}</Text>
            </Pressable>
          </View>
        </>
      )}

      {!user && (
        <Link href="/login" asChild>
          <Pressable style={styles.linkBtn}>
            <Text style={styles.linkText}>{t("puzzles.loginLink")}</Text>
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
