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

type Tab = "daily" | "rush" | "training" | "battle" | "survival";
const TABS: Tab[] = ["daily", "rush", "training", "battle", "survival"];

export default function PuzzlesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [trainingQueue, setTrainingQueue] = useState<Puzzle[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [rushSessionId, setRushSessionId] = useState<number | null>(null);
  const [survivalSessionId, setSurvivalSessionId] = useState<number | null>(null);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [battleId, setBattleId] = useState<number | null>(null);
  const [battleStatus, setBattleStatus] = useState("idle");
  const [battleScoreYou, setBattleScoreYou] = useState(0);
  const [battleScoreOpp, setBattleScoreOpp] = useState(0);
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

  const loadTraining = useCallback(() => {
    if (!user) {
      setError(t("puzzles.loginLink"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    reset();
    setTrainingIndex(0);
    puzzlesApi
      .training("medium", 10)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setTrainingQueue(list);
        setPuzzle(list[0] ?? null);
      })
      .catch(() => {
        setPuzzle(null);
        setError(t("puzzles.error.load"));
      })
      .finally(() => setLoading(false));
  }, [user, t]);

  const loadSurvival = useCallback(() => {
    if (!user) {
      setError(t("puzzles.error.rushLogin"));
      return;
    }
    setLoading(true);
    setError(null);
    reset();
    setSurvivalScore(0);
    setSurvivalSessionId(null);
    puzzlesApi
      .survivalStart()
      .then(({ data }) => {
        setSurvivalSessionId(data.session_id);
        setPuzzle(data.puzzle);
      })
      .catch(() => {
        setPuzzle(null);
        setError(t("puzzles.error.load"));
      })
      .finally(() => setLoading(false));
  }, [user, t]);

  const loadBattle = useCallback(() => {
    if (!user) {
      setError(t("puzzles.loginLink"));
      return;
    }
    setLoading(true);
    setError(null);
    reset();
    setBattleId(null);
    setBattleStatus("waiting");
    setBattleScoreYou(0);
    setBattleScoreOpp(0);
    puzzlesApi
      .battleQueue()
      .then(({ data }) => {
        setBattleId(data.battle_id);
        setBattleStatus(data.status);
        if (data.puzzle) {
          setPuzzle(data.puzzle);
          setBattleStatus("active");
        }
        setLoading(false);
      })
      .catch(() => {
        setBattleStatus("idle");
        setError(t("puzzles.error.load"));
        setLoading(false);
      });
  }, [user, t]);

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else if (tab === "rush") loadRush();
    else if (tab === "training") loadTraining();
    else if (tab === "survival") loadSurvival();
    else if (tab === "battle") loadBattle();
  }, [tab, loadDaily, loadRush, loadTraining, loadSurvival, loadBattle]);

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

  useEffect(() => {
    if (tab !== "battle" || !battleId || battleStatus !== "waiting") return;
    const poll = setInterval(() => {
      puzzlesApi.battleGet(battleId).then(({ data }) => {
        setBattleStatus(data.status);
        setBattleScoreYou(data.score1);
        setBattleScoreOpp(data.score2);
        if (data.puzzle) {
          setPuzzle(data.puzzle);
          setLoading(false);
        }
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(poll);
  }, [tab, battleId, battleStatus]);

  const displayFen = useMemo(() => {
    if (!puzzle) return "";
    return buildFenFromUciMoves(puzzle.fen, uciMoves);
  }, [puzzle, uciMoves]);

  const lastMove = useMemo(() => lastMoveFromUci(uciMoves), [uciMoves]);

  const advanceTraining = useCallback(() => {
    const next = trainingIndex + 1;
    if (next < trainingQueue.length) {
      setTrainingIndex(next);
      setPuzzle(trainingQueue[next]);
      reset();
    } else {
      setResult(t("puzzles.correct"));
      setPuzzle(null);
    }
  }, [trainingIndex, trainingQueue, t]);

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
        } else if (tab === "survival" && survivalSessionId) {
          const { data } = await puzzlesApi.survivalSubmit(survivalSessionId, moves, time);
          setSurvivalScore(data.score ?? survivalScore);
          const solved = Boolean(data.solved);
          if (data.completed) {
            setResult(t("puzzles.rush.done", { score: data.score ?? survivalScore }));
            setPuzzle(null);
            setSurvivalSessionId(null);
            return;
          }
          setResult(solved ? t("puzzles.correct") : t("puzzles.wrong"));
          if (solved) playPuzzleSuccess();
          else playPuzzleWrong();
          if (!solved) setPuzzleFailed(true);
          if (data.next_puzzle) {
            setTimeout(() => {
              setPuzzle(data.next_puzzle!);
              reset();
            }, 600);
          }
        } else if (tab === "battle" && battleId) {
          const { data } = await puzzlesApi.battleSubmit(battleId, moves, time);
          setBattleScoreYou(data.score1);
          setBattleScoreOpp(data.score2);
          const solved = Boolean(data.solved);
          if (data.completed) {
            setResult(`${data.score1} - ${data.score2}`);
            setPuzzle(null);
            setBattleId(null);
            return;
          }
          setResult(solved ? t("puzzles.correct") : t("puzzles.wrong"));
          if (solved) playPuzzleSuccess();
          else playPuzzleWrong();
          if (!solved) setPuzzleFailed(true);
          if (data.next_puzzle) {
            setTimeout(() => {
              setPuzzle(data.next_puzzle!);
              reset();
            }, 600);
          }
        } else if (tab === "training") {
          const { data } = await puzzlesApi.submit(puzzle.id, moves, time);
          if (data.solved) {
            setPuzzleSolved(true);
            playPuzzleSuccess();
            setResult(t("puzzles.correct"));
            setTimeout(advanceTraining, 600);
          } else {
            setPuzzleFailed(true);
            setResult(t("puzzles.wrongLine"));
            playPuzzleWrong();
          }
        } else {
          const { data } = await puzzlesApi.submit(puzzle.id, moves, time);
          if (data.daily_streak != null) setStreak(data.daily_streak);
          const solved = data.solved;
          if (solved) {
            setPuzzleSolved(true);
            setLastXp(data.xp_gained);
            setGardenVisible(true);
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
    [
      puzzle,
      user,
      startTime,
      tab,
      rushSessionId,
      rushScore,
      rushMisses,
      survivalSessionId,
      survivalScore,
      streak,
      advanceTraining,
      t,
    ]
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

  const reload = () => {
    if (tab === "daily") loadDaily();
    else if (tab === "rush") loadRush();
    else if (tab === "training") loadTraining();
    else if (tab === "survival") loadSurvival();
    else loadBattle();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }}>
        <View style={styles.tabs}>
          {TABS.map((tabKey) => (
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
      </ScrollView>

      {streak > 0 && tab === "daily" && (
        <Text style={styles.streak}>{t("puzzles.streak", { count: streak })}</Text>
      )}
      {tab === "training" && trainingQueue.length > 0 && (
        <Text style={styles.streak}>
          {trainingIndex + 1}/{trainingQueue.length}
        </Text>
      )}
      {tab === "survival" && survivalSessionId && (
        <Text style={styles.streak}>{t("puzzles.rush.done", { score: survivalScore })}</Text>
      )}
      {tab === "battle" && battleStatus === "waiting" && (
        <Text style={styles.streak}>{battleOpponent ?? t("puzzles.none")}</Text>
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
          <Pressable style={styles.btn} onPress={reload}>
            <Text style={styles.btnText}>{t("puzzles.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.meta}>
            <Text style={styles.badge}>{puzzle.difficulty}</Text>
            <Text style={styles.badge}>ELO {puzzle.rating}</Text>
          </View>
          <View style={{ position: "relative", width: "100%" }}>
            <ChessBoard
              fen={displayFen || puzzle.fen}
              orientation="white"
              lastMove={lastMove}
              onMove={handleMove}
              disabled={puzzleFailed || puzzleSolved}
            />
            <PuzzleGardenMobile
              visible={gardenVisible}
              current={1}
              streak={streak}
              xpGained={lastXp}
              onDone={() => setGardenVisible(false)}
            />
          </View>
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

      {!user && tab !== "daily" && (
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
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    minWidth: 72,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#1B7A3D", borderColor: "#D4A017" },
  tabText: { color: "#aaa", fontWeight: "600", fontSize: 12 },
  tabTextActive: { color: "#fff", fontWeight: "700", fontSize: 12 },
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
