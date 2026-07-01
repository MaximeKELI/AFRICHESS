"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { PuzzleBoard } from "@/components/puzzles/PuzzleBoard";
import {
  PuzzleSolveCelebration,
  type PuzzleCelebrationData,
  type CelebrationVariant,
} from "@/components/puzzles/PuzzleSolveCelebration";
import { PuzzleProgressRail } from "@/components/puzzles/PuzzleProgressRail";
import { PuzzleMiniStairs } from "@/components/puzzles/PuzzleMiniStairs";
import { PuzzleSettingsPanel } from "@/components/puzzles/PuzzleSettingsPanel";
import { PuzzleSessionRecapModal } from "@/components/puzzles/PuzzleSessionRecap";
import { PuzzleBadgeToast } from "@/components/puzzles/PuzzleBadgeToast";
import { OptionSection } from "@/components/ui/OptionSection";
import { puzzlesApi, ratingsApi } from "@/lib/api";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelLabel } from "@/lib/i18n/labels";
import { getPuzzleStreak, recordPuzzleSolved } from "@/lib/puzzleStreak";
import {
  evaluateNewBadges,
  loadUnlockedBadges,
  saveUnlockedBadges,
  type PuzzleBadgeId,
} from "@/lib/puzzleBadges";
import { PuzzleSessionTracker, type PuzzleSessionRecap } from "@/lib/puzzleSession";
import {
  getLifetimePuzzleSolved,
  incrementLifetimePuzzleSolved,
  puzzleSoundsActive,
} from "@/store/puzzlePreferences";
import { playPuzzleAdvance, playPuzzleWrong, preloadPuzzleSounds } from "@/lib/puzzleSounds";
import Link from "next/link";

interface Puzzle {
  id: number;
  fen: string;
  solution_moves: string[];
  themes: string[];
  difficulty: string;
  rating: number;
}

interface LeaderboardRow {
  rank: number;
  username: string;
  display_name: string;
  solved_count: number;
}

type Tab = "daily" | "training" | "rush" | "battle" | "survival" | "leaderboard";

export default function PuzzlesPage() {
  const { user, lowBandwidth } = useAuthStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [trainingQueue, setTrainingQueue] = useState<Puzzle[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [theme, setTheme] = useState("");
  const [themes, setThemes] = useState<string[]>([]);
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [boardKey, setBoardKey] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [puzzleElo, setPuzzleElo] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [rushQueue, setRushQueue] = useState<Puzzle[]>([]);
  const [rushIndex, setRushIndex] = useState(0);
  const [rushSessionId, setRushSessionId] = useState<number | null>(null);
  const [survivalSessionId, setSurvivalSessionId] = useState<number | null>(null);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [rushEndsAt, setRushEndsAt] = useState<number | null>(null);
  const [rushScore, setRushScore] = useState(0);
  const [rushMisses, setRushMisses] = useState(0);
  const [rushTimeLeft, setRushTimeLeft] = useState(180);
  const [battleId, setBattleId] = useState<number | null>(null);
  const [battleStatus, setBattleStatus] = useState<string>("idle");
  const [battleOpponent, setBattleOpponent] = useState<string | null>(null);
  const [battleScoreYou, setBattleScoreYou] = useState(0);
  const [battleScoreOpp, setBattleScoreOpp] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [celebration, setCelebration] = useState<PuzzleCelebrationData | null>(null);
  const pendingAfterCelebration = useRef<(() => void) | null>(null);
  const sessionRef = useRef(new PuzzleSessionTracker());
  const unlockedBadgesRef = useRef<Set<PuzzleBadgeId>>(new Set());
  const [showMiniError, setShowMiniError] = useState(false);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [hintOffered, setHintOffered] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [badgeQueue, setBadgeQueue] = useState<PuzzleBadgeId[]>([]);
  const [recapOpen, setRecapOpen] = useState(false);
  const [sessionRecap, setSessionRecap] = useState<PuzzleSessionRecap | null>(null);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);

  const unlockCtx = useMemo(
    () => ({
      lifetimeSolved: getLifetimePuzzleSolved(),
      dailyStreak: streak,
      sessionPerfectStreak: sessionRef.current.getPerfectStreak(),
      completedFullSet:
        tab === "training" &&
        trainingQueue.length > 0 &&
        trainingIndex + 1 >= trainingQueue.length &&
        Boolean(result?.startsWith("✓")),
    }),
    [streak, tab, trainingQueue.length, trainingIndex, result]
  );

  const refreshWeeklyRank = useCallback(() => {
    if (!user) return;
    puzzlesApi
      .leaderboard()
      .then(({ data }) => {
        const list: LeaderboardRow[] = Array.isArray(data) ? data : [];
        const row = list.find((r) => r.username === user.username);
        setWeeklyRank(row?.rank ?? null);
      })
      .catch(() => {});
  }, [user]);

  const queueBadges = useCallback(
    (ctx: Parameters<typeof evaluateNewBadges>[0]) => {
      const earned = evaluateNewBadges(ctx, unlockedBadgesRef.current);
      if (!earned.length) return;
      for (const id of earned) unlockedBadgesRef.current.add(id);
      saveUnlockedBadges(user?.id ?? null, unlockedBadgesRef.current);
      setBadgeQueue((q) => [...q, ...earned]);
    },
    [user?.id]
  );

  const resolveCelebrationVariant = useCallback(
    (sessionStreak: number, current: number, total?: number | null): CelebrationVariant => {
      if (total && total >= 10 && current >= total) return "perfect_set";
      if (sessionStreak >= 10) return "streak10";
      if (sessionStreak >= 5) return "streak5";
      if (sessionStreak >= 3) return "streak3";
      if (current === 1 && getLifetimePuzzleSolved() <= 1) return "first";
      return "default";
    },
    []
  );

  const triggerCelebration = useCallback(
    (payload: Omit<PuzzleCelebrationData, "id">, after?: () => void) => {
      pendingAfterCelebration.current = after ?? null;
      setCelebration({ ...payload, id: Date.now() });
    },
    []
  );

  const handleCelebrationDone = useCallback(() => {
    setCelebration(null);
    const fn = pendingAfterCelebration.current;
    pendingAfterCelebration.current = null;
    fn?.();
  }, []);

  useEffect(() => {
    const warm = () => preloadPuzzleSounds();
    window.addEventListener("pointerdown", warm, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, []);

  useEffect(() => {
    puzzlesApi.themes().then(({ data }) => {
      setThemes(Array.isArray(data.themes) ? data.themes : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      puzzlesApi.streak().then(({ data }) => setStreak(data.daily_streak ?? 0)).catch(() => setStreak(getPuzzleStreak()));
      ratingsApi.me().then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        const pr = list.find((r: { mode: string }) => r.mode === "puzzle");
        if (pr) setPuzzleElo(pr.elo);
      }).catch(() => {});
    } else {
      setStreak(getPuzzleStreak());
    }
  }, [user]);

  useEffect(() => {
    if (tab !== "rush" || !rushEndsAt || !puzzle) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((rushEndsAt - Date.now()) / 1000));
      setRushTimeLeft(left);
      if (left <= 0) {
        setResult(t("puzzles.rush.timeUp", { score: rushScore }));
        setPuzzle(null);
        setRushSessionId(null);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [tab, rushEndsAt, puzzle, rushScore, t]);

  useEffect(() => {
    if (tab !== "battle" || !battleId || battleStatus !== "waiting") return;
    const poll = setInterval(() => {
      puzzlesApi.battleGet(battleId).then(({ data }) => {
        setBattleStatus(data.status);
        if (data.puzzle) {
          setPuzzle(data.puzzle);
          setUciMoves([]);
          setResult(null);
        }
        if (data.score1 != null) {
          setBattleScoreYou(data.score1);
          setBattleScoreOpp(data.score2);
        }
      }).catch(() => {});
    }, 2000);
    return () => clearInterval(poll);
  }, [tab, battleId, battleStatus]);

  const loadDaily = () => {
    setResult(null);
    setPuzzleFailed(false);
    setUciMoves([]);
    setStartTime(Date.now());
    setLoadError(null);
    puzzlesApi
      .daily()
      .then(({ data }) => setPuzzle(data))
      .catch((err) => {
        setPuzzle(null);
        setLoadError(formatApiError(err, t("puzzles.error.daily")));
      });
  };

  const loadRush = () => {
    if (!user) {
      setLoadError(t("puzzles.rush.loginRequired"));
      return;
    }
    setResult(null);
    setUciMoves([]);
    setStartTime(Date.now());
    setRushScore(0);
    setRushMisses(0);
    setRushTimeLeft(180);
    setRushSessionId(null);
    setRushEndsAt(null);
    setLoadError(null);
    puzzlesApi
      .rushStart()
      .then(({ data }) => {
        setRushSessionId(data.session_id);
        setRushEndsAt(new Date(data.ends_at).getTime());
        setRushTimeLeft(data.duration ?? 180);
        setRushQueue([data.puzzle]);
        setRushIndex(0);
        setPuzzle(data.puzzle);
      })
      .catch((err) => {
        setPuzzle(null);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setLoadError(t("puzzles.rush.premiumLimit"));
        } else {
          setLoadError(formatApiError(err, t("puzzles.error.rush")));
        }
      });
  };

  const loadSurvival = () => {
    if (!user) return;
    setSurvivalSessionId(null);
    setSurvivalScore(0);
    setPuzzle(null);
    setResult(null);
    setUciMoves([]);
    setLoadError(null);
    puzzlesApi
      .survivalStart()
      .then(({ data }) => {
        setSurvivalSessionId(data.session_id);
        setPuzzle(data.puzzle);
        setStartTime(Date.now());
      })
      .catch((err) => setLoadError(formatApiError(err, t("puzzles.error.survival"))));
  };

  const loadBattle = () => {
    setBattleId(null);
    setBattleStatus("idle");
    setBattleOpponent(null);
    setBattleScoreYou(0);
    setBattleScoreOpp(0);
    setPuzzle(null);
    setResult(null);
    setUciMoves([]);
    setLoadError(null);
  };

  const findBattle = async () => {
    if (!user) {
      setLoadError(t("puzzles.battle.loginRequired"));
      return;
    }
    setLoadError(null);
    try {
      const { data } = await puzzlesApi.battleQueue();
      setBattleId(data.battle_id);
      setBattleStatus(data.status);
      if (data.opponent) setBattleOpponent(data.opponent);
      if (data.puzzle) {
        setPuzzle(data.puzzle);
        setStartTime(Date.now());
      }
    } catch (err) {
      setLoadError(formatApiError(err, t("puzzles.battle.error")));
    }
  };

  const leaveBattleQueue = async () => {
    await puzzlesApi.battleLeave().catch(() => {});
    loadBattle();
  };

  const loadLeaderboard = () => {
    setLoadError(null);
    puzzlesApi
      .leaderboard()
      .then(({ data }) => setLeaderboard(Array.isArray(data) ? data : []))
      .catch((err) => {
        setLeaderboard([]);
        setLoadError(formatApiError(err, t("puzzles.error.leaderboard")));
      });
  };

  const loadTraining = () => {
    setResult(null);
    setPuzzleFailed(false);
    setUciMoves([]);
    setStartTime(Date.now());
    setLoadError(null);
    puzzlesApi
      .training(difficulty, 10, theme || undefined)
      .then(({ data }) => {
        const list: Puzzle[] = Array.isArray(data) ? data : data.results ?? [];
        setTrainingQueue(list);
        setTrainingIndex(0);
        setPuzzle(list[0] ?? null);
      })
      .catch((err) => {
        setPuzzle(null);
        setLoadError(formatApiError(err, t("puzzles.error.training")));
      });
  };

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else if (tab === "training") loadTraining();
    else if (tab === "rush") loadRush();
    else if (tab === "battle") loadBattle();
    else if (tab === "survival") loadSurvival();
    else if (tab === "leaderboard") loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, difficulty, theme]);

  const submitWithMoves = async (moves: string[]) => {
    if (!puzzle) return;
    if (!user && tab !== "rush" && tab !== "survival" && tab !== "battle") {
      setResult(t("puzzles.loginToSubmit"));
      return;
    }
    if (!user) return;
    setUciMoves(moves);
    const time = Math.floor((Date.now() - startTime) / 1000);
    try {
      if (tab === "rush" && rushSessionId) {
        const { data } = await puzzlesApi.rushSubmit(rushSessionId, moves, time);
        setRushScore(data.score ?? rushScore);
        setRushMisses(data.misses ?? rushMisses);
        if (data.time_left != null) {
          setRushEndsAt(Date.now() + data.time_left * 1000);
          setRushTimeLeft(data.time_left);
        }
        const solved = Boolean(data.solved);
        if (data.completed) {
          const reason = data.reason === "timeout"
            ? t("puzzles.rush.timeUp", { score: data.score })
            : data.misses >= 3
              ? t("puzzles.rush.threeMisses", { score: data.score })
              : t("puzzles.rush.done", { score: data.score });
          setResult(reason);
          setPuzzle(null);
          setRushSessionId(null);
          return;
        }
        if (!solved) {
          playPuzzleWrong(!lowBandwidth);
          setResult(t("puzzles.solved.wrong"));
        } else {
          const newScore = data.score ?? rushScore + 1;
          setResult(t("puzzles.solved.bravo", { streak: streak, rush: "" }));
          triggerCelebration(
            { current: newScore, mode: "rush" },
            () => {
              if (data.next_puzzle) {
                playPuzzleAdvance(!lowBandwidth);
                setRushIndex((i) => i + 1);
                setRushQueue((q) => [...q, data.next_puzzle]);
                setPuzzle(data.next_puzzle);
                setUciMoves([]);
                setStartTime(Date.now());
                setBoardKey((k) => k + 1);
              }
            }
          );
        }
        if (!solved && data.next_puzzle) {
          setRushIndex((i) => i + 1);
          setRushQueue((q) => [...q, data.next_puzzle]);
          setTimeout(() => {
            setPuzzle(data.next_puzzle!);
            setUciMoves([]);
            setStartTime(Date.now());
            setBoardKey((k) => k + 1);
          }, 600);
        }
        return;
      }

      if (tab === "survival" && survivalSessionId) {
        const { data } = await puzzlesApi.survivalSubmit(survivalSessionId, moves, time);
        setSurvivalScore(data.score ?? survivalScore);
        if (data.completed) {
          setResult(
            data.solved
              ? t("puzzles.survival.over", { score: data.score })
              : t("puzzles.survival.eliminated", { score: data.score })
          );
          setPuzzle(null);
          setSurvivalSessionId(null);
          return;
        }
        const newScore = data.score ?? survivalScore + 1;
        setSurvivalScore(newScore);
        setResult(t("puzzles.solved.bravo", { streak: streak, rush: "" }));
        triggerCelebration(
          { current: newScore, mode: "survival" },
          () => {
            if (data.next_puzzle) {
              playPuzzleAdvance(!lowBandwidth);
              setPuzzle(data.next_puzzle);
              setUciMoves([]);
              setStartTime(Date.now());
              setBoardKey((k) => k + 1);
            }
          }
        );
        return;
      }

      if (tab === "battle" && battleId) {
        const { data } = await puzzlesApi.battleSubmit(battleId, moves, time);
        if (!data.solved) {
          setPuzzleFailed(true);
          setResult(t("puzzles.solved.wrong"));
          return;
        }
        const you = data.score1 ?? battleScoreYou;
        const opp = data.score2 ?? battleScoreOpp;
        setBattleScoreYou(you);
        setBattleScoreOpp(opp);
        if (data.completed) {
          setResult(
            data.winner_id === user.id
              ? t("puzzles.battle.win")
              : data.winner_id
                ? t("puzzles.battle.loss")
                : t("puzzles.battle.draw")
          );
          setPuzzle(null);
          return;
        }
        setResult(t("puzzles.solved.bravo", { streak: streak, rush: "" }));
        triggerCelebration({ current: you, mode: "battle" }, async () => {
          if (battleId) {
            const { data: detail } = await puzzlesApi.battleGet(battleId);
            if (detail.puzzle) {
              playPuzzleAdvance(!lowBandwidth);
              setPuzzle(detail.puzzle);
              setUciMoves([]);
              setStartTime(Date.now());
              setBoardKey((k) => k + 1);
            }
          }
        });
        return;
      }

      const { data } = await puzzlesApi.submit(puzzle.id, moves, time);
      if (data.puzzle_elo != null) setPuzzleElo(data.puzzle_elo);
      const solved = Boolean(data.solved);
      const nextStreak = tab === "daily" && data.daily_streak != null
        ? data.daily_streak
        : recordPuzzleSolved(solved);
      if (tab === "daily" && data.daily_streak != null) {
        setStreak(data.daily_streak);
      } else {
        setStreak(nextStreak);
      }
      if (solved) {
        setResult(
          t("puzzles.solved.bravo", {
            streak: nextStreak,
            rush: "",
          })
        );
        triggerCelebration({
          current: tab === "training" ? trainingIndex + 1 : 1,
          total: tab === "training" ? trainingQueue.length : 1,
          streak: nextStreak,
          eloChange: data.puzzle_elo_change,
          mode: tab === "daily" ? "daily" : "training",
        });
      } else {
        playPuzzleWrong(!lowBandwidth);
        setResult(t("puzzles.solved.wrong"));
        setPuzzleFailed(true);
      }
    } catch {
      setResult(t("puzzles.loginToSubmit"));
    }
  };

  const handlePuzzleComplete = useCallback(
    (moves: string[]) => {
      void submitWithMoves(moves);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzle, user, tab, rushSessionId, survivalSessionId, battleId, startTime]
  );

  const handlePuzzleWrong = useCallback(
    (played: string[]) => {
      if (tab === "rush" || tab === "survival") {
        void submitWithMoves(played);
        return;
      }
      if (tab === "battle") {
        setPuzzleFailed(true);
        setResult(t("puzzles.solved.wrong"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, puzzle]
  );

  const reset = () => {
    setUciMoves([]);
    setResult(null);
    setPuzzleFailed(false);
    setStartTime(Date.now());
    setBoardKey((k) => k + 1);
  };

  const retryPuzzle = () => {
    reset();
  };

  const puzzleSolved = Boolean(result?.startsWith("✓"));

  const nextRush = () => {
    const next = rushIndex + 1;
    if (next < rushQueue.length) {
      setRushIndex(next);
      setPuzzle(rushQueue[next]);
      reset();
    } else {
      setResult(t("puzzles.rush.done", { score: rushScore }));
      setPuzzle(null);
    }
  };

  const nextTraining = () => {
    const next = trainingIndex + 1;
    if (next < trainingQueue.length) {
      setTrainingIndex(next);
      setPuzzle(trainingQueue[next]);
      reset();
    } else {
      loadTraining();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("puzzles.title")}</h1>
      <p className="opacity-70 mb-4">
        {t("puzzles.subtitle")}
        {streak > 0 && (
          <span className="ml-2 text-africhess-gold">🔥 {t("puzzles.streak", { n: streak })}</span>
        )}
        {puzzleElo != null && user && (
          <span className="ml-2 text-africhess-green">{t("puzzles.playerElo", { elo: puzzleElo })}</span>
        )}
      </p>

      {loadError && (
        <InlineAlert className="mb-4" onDismiss={() => setLoadError(null)}>
          {loadError}
          {loadError === t("puzzles.rush.premiumLimit") && (
            <>
              {" "}
              <Link href="/premium" className="text-africhess-gold hover:underline">
                {t("premium.title")}
              </Link>
            </>
          )}
        </InlineAlert>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("daily")}
          className={`px-4 py-2 rounded-lg ${tab === "daily" ? "african-gradient text-white" : "border"}`}
        >
          {t("puzzles.tab.daily")}
        </button>
        <button
          type="button"
          onClick={() => setTab("training")}
          className={`px-4 py-2 rounded-lg ${tab === "training" ? "african-gradient text-white" : "border"}`}
        >
          {t("puzzles.tab.training")}
        </button>
        <button
          type="button"
          onClick={() => setTab("rush")}
          className={`px-4 py-2 rounded-lg ${tab === "rush" ? "african-gradient text-white" : "border"}`}
        >
          {t("puzzles.tab.rush")}
        </button>
        <button
          type="button"
          onClick={() => setTab("battle")}
          className={`px-4 py-2 rounded-lg ${tab === "battle" ? "african-gradient text-white" : "border"}`}
        >
          {t("puzzles.tab.battle")}
        </button>
        <button
          type="button"
          onClick={() => setTab("survival")}
          className={`px-4 py-2 rounded-lg ${tab === "survival" ? "african-gradient text-white" : "border"}`}
        >
          {t("puzzles.tab.survival")}
        </button>
        <Link
          href="/puzzles/build"
          className="px-4 py-2 rounded-lg border text-sm hover:border-africhess-gold"
        >
          {t("nav.puzzleBuild")}
        </Link>
        <button
          type="button"
          onClick={() => setTab("leaderboard")}
          className={`px-4 py-2 rounded-lg ${tab === "leaderboard" ? "african-gradient text-white" : "border"}`}
        >
          {t("puzzles.tab.leaderboard")}
        </button>
        {tab === "training" && (
          <>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-transparent text-sm"
            >
              <option value="beginner">{chessLevelLabel(t, "beginner")}</option>
              <option value="intermediate">{chessLevelLabel(t, "intermediate")}</option>
              <option value="advanced">{chessLevelLabel(t, "advanced")}</option>
              <option value="expert">{chessLevelLabel(t, "expert")}</option>
            </select>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-transparent text-sm"
            >
              <option value="">{t("puzzles.theme.all")}</option>
              {themes.map((th) => (
                <option key={th} value={th}>
                  {t(`puzzles.theme.${th}`)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {tab === "leaderboard" && (
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">{t("puzzles.leaderboard.title")}</h2>
          {leaderboard.length === 0 ? (
            <p className="opacity-60">{t("puzzles.leaderboard.empty")}</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((row) => (
                <li
                  key={row.rank}
                  className="flex justify-between text-sm border-b border-white/5 pb-2"
                >
                  <span>
                    {row.rank}.{" "}
                    <a href={`/profile/${row.username}`} className="hover:text-africhess-gold hover:underline">
                      {row.display_name || row.username}
                    </a>
                  </span>
                  <span className="text-africhess-gold">
                    {t("puzzles.leaderboard.solved", { n: row.solved_count })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === "battle" && !puzzle && (
        <div className="glass-card p-6 text-center space-y-4">
          {battleStatus === "waiting" ? (
            <>
              <p className="opacity-70">{t("puzzles.battle.waiting")}</p>
              <button type="button" onClick={leaveBattleQueue} className="px-4 py-2 border rounded-lg text-sm">
                {t("puzzles.battle.leave")}
              </button>
            </>
          ) : (
            <>
              <p className="opacity-70">{t("puzzles.battle.find")}</p>
              <button type="button" onClick={findBattle} className="px-6 py-2 african-gradient text-white rounded-lg">
                {t("puzzles.battle.find")}
              </button>
            </>
          )}
          {result && <p className="font-semibold">{result}</p>}
        </div>
      )}

      {tab !== "leaderboard" && puzzle && puzzle.solution_moves?.length ? (
        <div key={`${puzzle.id}-${boardKey}`}>
          {tab === "training" && trainingQueue.length > 1 && (
            <PuzzleProgressRail current={trainingIndex + 1} total={trainingQueue.length} />
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-africhess-green/20 text-sm capitalize">
              {puzzle.difficulty}
            </span>
            {(tab === "training" || tab === "rush") &&
              (tab === "training" ? trainingQueue : rushQueue).length > 0 && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {(tab === "training" ? trainingIndex : rushIndex) + 1}/
                {(tab === "training" ? trainingQueue : rushQueue).length}
              </span>
            )}
            {tab === "battle" && battleOpponent && (
              <span className="px-3 py-1 rounded-full bg-africhess-green/20 text-sm">
                vs {battleOpponent} · {t("puzzles.battle.score", { you: battleScoreYou, opp: battleScoreOpp })}
              </span>
            )}
            {tab === "survival" && survivalSessionId && (
              <span className="px-3 py-1 rounded-full bg-africhess-gold/20 text-sm">
                {t("puzzles.survival.score", { n: survivalScore })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(160px,200px)] gap-4 lg:gap-6 items-start">
            <div className="w-full min-w-0 relative min-h-[360px]">
              <PuzzleBoard
                puzzle={puzzle}
                onComplete={(moves) => handlePuzzleComplete(moves)}
                onWrong={handlePuzzleWrong}
                disabled={puzzleSolved && tab !== "rush" && tab !== "survival"}
              />
              <PuzzleSolveCelebration
                data={celebration}
                onDone={handleCelebrationDone}
                autoDismissMs={tab === "daily" || tab === "training" ? 3200 : 2800}
              />
            </div>
            <OptionSection
              compact
              title={t("board.picker.title")}
              description={t("board.picker.hint")}
              className="h-fit"
            >
              <BoardThemePicker compact showHeader={false} />
            </OptionSection>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <button type="button" onClick={reset} className="px-6 py-2 border rounded-lg">
              {t("puzzles.reset")}
            </button>
            {puzzleFailed && tab !== "rush" && tab !== "survival" && (
              <button
                type="button"
                onClick={retryPuzzle}
                className="px-6 py-2 african-gradient text-white rounded-lg font-medium"
              >
                {t("puzzles.retry")}
              </button>
            )}
            {tab === "training" && puzzleSolved && (
              <button
                type="button"
                onClick={nextTraining}
                className="px-6 py-2 border border-africhess-green text-africhess-green rounded-lg"
              >
                {t("puzzles.next")}
              </button>
            )}
            {tab === "daily" && puzzleSolved && (
              <button type="button" onClick={loadDaily} className="px-6 py-2 border rounded-lg">
                {t("puzzles.daily.reload")}
              </button>
            )}
            {tab === "rush" && puzzle && (
              <span className="text-sm font-mono text-africhess-gold ml-auto">
                {Math.floor(rushTimeLeft / 60)}:{String(rushTimeLeft % 60).padStart(2, "0")}
                {" · "}{t("puzzles.rush.score", { n: rushScore })}
                {" · "}{t("puzzles.rush.misses", { n: rushMisses })}
              </span>
            )}
          </div>
          {result && <p className="mt-4 text-lg font-semibold">{result}</p>}
        </div>
      ) : tab !== "leaderboard" && tab !== "battle" ? (
        <p>{t("puzzles.loading")}</p>
      ) : null}
    </div>
  );
}
