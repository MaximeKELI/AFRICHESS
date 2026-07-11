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
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { puzzlesApi, ratingsApi } from "@/lib/api";
import { learningApi } from "@/lib/learningApi";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { getPuzzleStreak, recordPuzzleSolved } from "@/lib/puzzleStreak";
import {
  evaluateNewBadges,
  loadUnlockedBadges,
  saveUnlockedBadges,
  type PuzzleBadgeId,
} from "@/lib/puzzleBadges";
import { PuzzleSessionTracker, type PuzzleSessionRecap } from "@/lib/puzzleSession";
import { alignMovesToSolution } from "@/lib/puzzleEngine";
import {
  getLifetimePuzzleSolved,
  incrementLifetimePuzzleSolved,
  puzzleSoundsActive,
} from "@/store/puzzlePreferences";
import { playPuzzleAdvance, playPuzzleWrong, preloadPuzzleSounds } from "@/lib/puzzleSounds";
import Link from "next/link";

/** score1/score2 are always player1/player2 — map to "you" / opponent. */
function mapBattleScores(
  userId: number | undefined | null,
  score1: number,
  score2: number,
  player1Id?: number | null,
  player2Id?: number | null
) {
  if (userId != null && player2Id != null && userId === player2Id) {
    return { you: score2, opp: score1 };
  }
  return { you: score1, opp: score2 };
}

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

interface RushLeaderboardRow {
  username: string;
  display_name: string;
  score: number;
}

type Tab = "daily" | "training" | "rush" | "storm" | "battle" | "survival" | "leaderboard";

const THEMATIC_PATHS = [
  { theme: "fork", labelKey: "puzzles.theme.fork" },
  { theme: "pin", labelKey: "puzzles.theme.pin" },
  { theme: "mate", labelKey: "puzzles.theme.mate" },
  { theme: "endgame", labelKey: "puzzles.theme.endgame" },
  { theme: "sacrifice", labelKey: "puzzles.theme.sacrifice" },
] as const;

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
  const [battlePlayer1Id, setBattlePlayer1Id] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [rushLeaderboard, setRushLeaderboard] = useState<RushLeaderboardRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [celebration, setCelebration] = useState<PuzzleCelebrationData | null>(null);
  const pendingAfterCelebration = useRef<(() => void) | null>(null);
  const sessionRef = useRef(new PuzzleSessionTracker());
  const sessionRecapSnapshotRef = useRef<PuzzleSessionRecap | null>(null);
  const unlockedBadgesRef = useRef<Set<PuzzleBadgeId>>(new Set());
  const [showMiniError, setShowMiniError] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  /** null = pas révélé ; true/false = flèche résolue ou non (évite message contradictoire) */
  const [hintAvailable, setHintAvailable] = useState<boolean | null>(null);
  const [hintOffered, setHintOffered] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [badgeQueue, setBadgeQueue] = useState<PuzzleBadgeId[]>([]);
  const [recapOpen, setRecapOpen] = useState(false);
  const [sessionRecap, setSessionRecap] = useState<PuzzleSessionRecap | null>(null);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [localPlayed, setLocalPlayed] = useState<string[]>([]);
  const trainingQueueRef = useRef(trainingQueue);
  trainingQueueRef.current = trainingQueue;
  const trainingIndexRef = useRef(trainingIndex);
  trainingIndexRef.current = trainingIndex;
  const usedHintRef = useRef(usedHint);
  usedHintRef.current = usedHint;

  const resetPuzzleUiForNewPuzzle = useCallback(() => {
    setUciMoves([]);
    setLocalPlayed([]);
    setResult(null);
    setPuzzleFailed(false);
    setHintRevealed(false);
    setHintAvailable(null);
    setHintOffered(false);
    setUsedHint(false);
    setShowMiniError(false);
    setStartTime(Date.now());
    setBoardKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!puzzle) return;
    setResult(null);
    setPuzzleFailed(false);
    setLocalPlayed([]);
    setHintRevealed(false);
    setHintAvailable(null);
    setHintOffered(false);
    setUsedHint(false);
    setShowMiniError(false);
    setUciMoves([]);
  }, [puzzle?.id]);

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

  const captureSessionRecapIfNeeded = useCallback(() => {
    const recap = sessionRef.current.buildRecap();
    sessionRecapSnapshotRef.current = recap;
    setSessionRecap(recap);
    return recap;
  }, []);

  const finishTrainingSession = useCallback(() => {
    const recap = sessionRecapSnapshotRef.current ?? sessionRef.current.buildRecap();
    setSessionRecap(recap);
    setRecapOpen(true);
    sessionRecapSnapshotRef.current = null;
    sessionRef.current.reset();
  }, []);

  const recordTrainingSolve = useCallback(
    (moves: string[], puzzleData: Puzzle) => {
      const time = Math.floor((Date.now() - startTime) / 1000);
      sessionRef.current.recordSolveOnce({
        puzzleId: puzzleData.id,
        rating: puzzleData.rating,
        themes: puzzleData.themes ?? [],
        difficulty: puzzleData.difficulty,
        wrongAttempts: sessionRef.current.getWrongCount(puzzleData.id),
        timeSeconds: time,
        usedHint: usedHintRef.current,
      });
      const idx = trainingIndexRef.current;
      const queue = trainingQueueRef.current;
      if (queue.length > 0 && idx + 1 >= queue.length) {
        captureSessionRecapIfNeeded();
      }
      return alignMovesToSolution(moves, puzzleData.solution_moves ?? []);
    },
    [startTime, captureSessionRecapIfNeeded]
  );

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
    unlockedBadgesRef.current = loadUnlockedBadges(user?.id ?? null);
    refreshWeeklyRank();
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
  }, [user, refreshWeeklyRank]);

  useEffect(() => {
    if ((tab !== "rush" && tab !== "storm") || !rushEndsAt || !puzzle) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((rushEndsAt - Date.now()) / 1000));
      setRushTimeLeft(left);
      if (left <= 0) {
        setResult(
          tab === "storm"
            ? t("puzzles.storm.timeUp", { score: rushScore })
            : t("puzzles.rush.timeUp", { score: rushScore })
        );
        setPuzzle(null);
        setRushSessionId(null);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [tab, rushEndsAt, puzzle, rushScore, t]);

  useEffect(() => {
    if (tab !== "battle" || !battleId) return;
    if (battleStatus !== "waiting" && battleStatus !== "active") return;
    const poll = setInterval(() => {
      puzzlesApi.battleGet(battleId).then(({ data }) => {
        setBattleStatus(data.status);
        if (data.player1_id != null) setBattlePlayer1Id(data.player1_id);
        if (data.opponent) setBattleOpponent(data.opponent);
        if (data.puzzle && battleStatus === "waiting") {
          setPuzzle(data.puzzle);
          setUciMoves([]);
          setResult(null);
          setStartTime(Date.now());
        }
        if (data.score1 != null) {
          const { you, opp } = mapBattleScores(
            user?.id,
            data.score1,
            data.score2 ?? 0,
            data.player1_id ?? battlePlayer1Id,
            data.player2_id
          );
          setBattleScoreYou(you);
          setBattleScoreOpp(opp);
        }
        if (data.status === "completed" && data.winner_id != null) {
          setResult(
            data.winner_id === user?.id
              ? t("puzzles.battle.win")
              : data.winner_id
                ? t("puzzles.battle.loss")
                : t("puzzles.battle.draw")
          );
        }
      }).catch(() => {});
    }, 2000);
    return () => clearInterval(poll);
  }, [tab, battleId, battleStatus, user?.id, battlePlayer1Id, t]);

  const loadDaily = () => {
    setResult(null);
    setPuzzleFailed(false);
    setUciMoves([]);
    setHintRevealed(false);
    setHintAvailable(null);
    setHintOffered(false);
    setUsedHint(false);
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

  const loadRushLeaderboard = () => {
    puzzlesApi
      .rushLeaderboard()
      .then(({ data }) => setRushLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setRushLeaderboard([]));
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

  const loadStorm = () => {
    if (!user) {
      setLoadError(t("puzzles.storm.loginRequired"));
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
      .stormStart()
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
        setLoadError(formatApiError(err, t("puzzles.error.storm")));
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
    setBattlePlayer1Id(null);
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
      if (data.player1_id != null) setBattlePlayer1Id(data.player1_id);
      if (data.opponent) setBattleOpponent(data.opponent);
      if (data.score1 != null) {
        const { you, opp } = mapBattleScores(
          user.id,
          data.score1,
          data.score2 ?? 0,
          data.player1_id,
          data.player2_id
        );
        setBattleScoreYou(you);
        setBattleScoreOpp(opp);
      }
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
    setHintRevealed(false);
    setHintAvailable(null);
    setHintOffered(false);
    setUsedHint(false);
    setStartTime(Date.now());
    setLoadError(null);
    setRecapOpen(false);
    sessionRecapSnapshotRef.current = null;
    sessionRef.current.reset();
    const req =
      difficulty === "adaptive"
        ? learningApi.adaptivePuzzles(10)
        : puzzlesApi.training(difficulty, 10, theme || undefined);
    req
      .then(({ data }) => {
        const list: Puzzle[] = Array.isArray(data) ? data : data.results ?? [];
        setTrainingQueue(list);
        setTrainingIndex(0);
        setPuzzle(list[0] ?? null);
        if (list.length === 0) {
          setLoadError(t("puzzles.error.emptyPool"));
        }
      })
      .catch((err) => {
        setPuzzle(null);
        setLoadError(formatApiError(err, t("puzzles.error.training")));
      });
  };

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else if (tab === "training") loadTraining();
    else if (tab === "rush") {
      loadRushLeaderboard();
      loadRush();
    }
    else if (tab === "storm") loadStorm();
    else if (tab === "battle") loadBattle();
    else if (tab === "survival") loadSurvival();
    else if (tab === "leaderboard") loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, difficulty, theme]);

  const submitWithMoves = async (moves: string[]) => {
    if (!puzzle) return;
    if (!user && tab !== "rush" && tab !== "storm" && tab !== "survival" && tab !== "battle") {
      setResult(t("puzzles.loginToSubmit"));
      return;
    }
    if (!user) return;
    const submitMoves = puzzle.solution_moves?.length
      ? alignMovesToSolution(moves, puzzle.solution_moves)
      : moves;
    setUciMoves(submitMoves);
    const time = Math.floor((Date.now() - startTime) / 1000);
    try {
      if ((tab === "rush" || tab === "storm") && rushSessionId) {
        const submit =
          tab === "storm"
            ? puzzlesApi.stormSubmit(rushSessionId, moves, time)
            : puzzlesApi.rushSubmit(rushSessionId, moves, time);
        const { data } = await submit;
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
          playPuzzleWrong(puzzleSoundsActive(lowBandwidth));
          setResult(t("puzzles.solved.wrong"));
        } else {
          const newScore = data.score ?? rushScore + 1;
          setResult(t("puzzles.solved.bravo", { streak: streak, rush: "" }));
          triggerCelebration(
            {
              current: newScore,
              mode: "rush",
              manualContinue: false,
              sessionStreak: newScore,
            },
            () => {
              if (data.next_puzzle) {
                playPuzzleAdvance(puzzleSoundsActive(lowBandwidth));
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
          {
            current: newScore,
            mode: "survival",
            manualContinue: false,
            sessionStreak: newScore,
          },
          () => {
            if (data.next_puzzle) {
              playPuzzleAdvance(puzzleSoundsActive(lowBandwidth));
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
        if (data.player1_id != null) setBattlePlayer1Id(data.player1_id);
        const { you, opp } = mapBattleScores(
          user?.id,
          data.score1 ?? battleScoreYou,
          data.score2 ?? battleScoreOpp,
          data.player1_id ?? battlePlayer1Id,
          data.player2_id
        );
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
        triggerCelebration(
          { current: you, mode: "battle", manualContinue: false },
          async () => {
          if (battleId) {
            const { data: detail } = await puzzlesApi.battleGet(battleId);
            if (detail.puzzle) {
              playPuzzleAdvance(puzzleSoundsActive(lowBandwidth));
              setPuzzle(detail.puzzle);
              setUciMoves([]);
              setStartTime(Date.now());
              setBoardKey((k) => k + 1);
            }
          }
        });
        return;
      }

      const { data } = await puzzlesApi.submit(puzzle.id, submitMoves, time);
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
        const wrongAttempts = sessionRef.current.getWrongCount(puzzle.id);
        const lifetime = incrementLifetimePuzzleSolved() ?? getLifetimePuzzleSolved();
        sessionRef.current.recordSolveOnce({
          puzzleId: puzzle.id,
          rating: puzzle.rating,
          themes: puzzle.themes,
          difficulty: puzzle.difficulty,
          wrongAttempts,
          timeSeconds: time,
          usedHint: usedHintRef.current,
        });
        if (tab === "training") {
          const idx = trainingIndexRef.current;
          const queue = trainingQueueRef.current;
          if (queue.length > 0 && idx + 1 >= queue.length) {
            captureSessionRecapIfNeeded();
          }
        }
        const sessionStreak = sessionRef.current.getPerfectStreak();
        const sessionSolved = sessionRef.current.getSolvedCount();
        const trainingCurrent = tab === "training" ? trainingIndex + 1 : 1;
        const trainingTotal = tab === "training" ? trainingQueue.length : 1;
        const completedFullSet =
          tab === "training" && trainingCurrent >= trainingTotal && trainingTotal >= 10;

        queueBadges({
          sessionSolved,
          perfectStreak: sessionStreak,
          dailyStreak: nextStreak,
          rushScore: 0,
          completedFullSet,
          solvedWithoutHint: !usedHint,
          lifetimeSolved: lifetime,
        });

        refreshWeeklyRank();

        setResult(
          t("puzzles.solved.bravo", {
            streak: nextStreak,
            rush: "",
          })
        );
        setHintRevealed(false);
        setHintAvailable(null);
        setHintOffered(false);
        setUsedHint(false);

        const variant = resolveCelebrationVariant(sessionStreak, trainingCurrent, trainingTotal);

        triggerCelebration(
          {
            current: trainingCurrent,
            total: tab === "training" ? trainingTotal : 1,
            streak: nextStreak,
            sessionStreak,
            eloChange: data.puzzle_elo_change,
            xpGained: data.xp_gained,
            weeklyRank,
            mode: tab === "daily" ? "daily" : "training",
            variant,
            showShare: tab === "daily",
            manualContinue: tab === "daily" || tab === "training",
          },
          () => {
            if (tab === "training") {
              setTrainingIndex((idx) => {
                const next = idx + 1;
                const queue = trainingQueueRef.current;
                if (next < queue.length) {
                  playPuzzleAdvance(puzzleSoundsActive(lowBandwidth));
                  setPuzzle(queue[next]);
                  resetPuzzleUiForNewPuzzle();
                  return next;
                }
                setRecapOpen(true);
                sessionRecapSnapshotRef.current = null;
                sessionRef.current.reset();
                return idx;
              });
            }
          }
        );
      } else {
        playPuzzleWrong(puzzleSoundsActive(lowBandwidth));
        if (tab === "training") {
          if (sessionRef.current.hasEntry(puzzle.id)) {
            sessionRef.current.reviseOutcome(puzzle.id, false);
          } else {
            sessionRef.current.recordFail({
              puzzleId: puzzle.id,
              rating: puzzle.rating,
              themes: puzzle.themes,
              difficulty: puzzle.difficulty,
              wrongAttempts: sessionRef.current.getWrongCount(puzzle.id),
              timeSeconds: time,
              usedHint: usedHintRef.current,
            });
          }
          const idx = trainingIndexRef.current;
          const queue = trainingQueueRef.current;
          if (queue.length > 0 && idx + 1 >= queue.length) {
            captureSessionRecapIfNeeded();
          }
        } else {
          sessionRef.current.recordFail({
            puzzleId: puzzle.id,
            rating: puzzle.rating,
            themes: puzzle.themes,
            difficulty: puzzle.difficulty,
            wrongAttempts: sessionRef.current.getWrongCount(puzzle.id),
            timeSeconds: time,
            usedHint: usedHintRef.current,
          });
        }
        setResult(t("puzzles.solved.wrong"));
        setPuzzleFailed(true);
      }
    } catch {
      setResult(t("puzzles.loginToSubmit"));
    }
  };

  const handlePuzzleComplete = useCallback(
    (moves: string[]) => {
      const aligned =
        puzzle && tab === "training" ? recordTrainingSolve(moves, puzzle) : moves;
      void submitWithMoves(aligned);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzle, user, tab, rushSessionId, survivalSessionId, battleId, startTime, recordTrainingSolve]
  );

  const handlePuzzleWrong = useCallback(
    (played: string[]) => {
      if (puzzle && tab !== "rush" && tab !== "storm" && tab !== "survival") {
        sessionRef.current.recordWrong(puzzle.id);
        setShowMiniError(true);
        window.setTimeout(() => setShowMiniError(false), 700);
        if (sessionRef.current.shouldOfferHint(puzzle.id) && !hintOffered) {
          setHintOffered(true);
        }
      }
      if (tab === "rush" || tab === "storm" || tab === "survival") {
        void submitWithMoves(played);
        return;
      }
      if (tab === "battle") {
        setPuzzleFailed(true);
        setResult(t("puzzles.solved.wrong"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, puzzle, hintOffered]
  );

  const revealHint = () => {
    if (!puzzle) return;
    setHintRevealed(true);
    setUsedHint(true);
  };

  const handleHintStatus = useCallback((status: boolean | null) => {
    setHintAvailable(status);
  }, []);

  const startThematicPath = (pathTheme: string) => {
    setTheme(pathTheme);
    setTab("training");
  };

  const reviewPuzzle = async (puzzleId: number) => {
    setRecapOpen(false);
    try {
      const { data } = await puzzlesApi.get(puzzleId);
      setTab("training");
      setTrainingQueue([data]);
      setTrainingIndex(0);
      setPuzzle(data);
      setUciMoves([]);
      setResult(null);
      setPuzzleFailed(false);
      setHintRevealed(false);
      setHintAvailable(null);
      setHintOffered(false);
      setUsedHint(false);
      setStartTime(Date.now());
      setBoardKey((k) => k + 1);
    } catch {
      setLoadError(t("puzzles.error.training"));
    }
  };

  const reset = () => {
    resetPuzzleUiForNewPuzzle();
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
      finishTrainingSession();
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

      {tab === "training" && (
      <div className="glass-card p-4 mb-6">
        <p className="text-sm font-medium mb-1">{t("puzzles.paths.title")}</p>
        <p className="text-xs opacity-60 mb-3">{t("puzzles.paths.hint")}</p>
        <div className="flex flex-wrap gap-2">
          {THEMATIC_PATHS.map((path) => (
            <button
              key={path.theme}
              type="button"
              onClick={() => startThematicPath(path.theme)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                theme === path.theme
                  ? "border-africhess-gold bg-africhess-gold/15 text-africhess-gold"
                  : "border-white/20 hover:border-africhess-gold/40"
              }`}
            >
              {t(path.labelKey)}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {(["daily", "training", "rush", "storm"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg ${
              tab === id
                ? "african-gradient text-white"
                : "border border-white/20 hover:border-africhess-gold/50"
            }`}
          >
            {t(`puzzles.tab.${id}`)}
          </button>
        ))}
        <select
          aria-label={t("puzzles.tab.more")}
          className="px-3 py-2 rounded-lg border border-white/20 bg-transparent text-sm"
          value={
            tab === "battle" || tab === "survival" || tab === "leaderboard" ? tab : ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "build") {
              window.location.href = "/puzzles/build";
              return;
            }
            if (v === "battle" || v === "survival" || v === "leaderboard") setTab(v);
          }}
        >
          <option value="">{t("puzzles.tab.more")}</option>
          <option value="battle">{t("puzzles.tab.battle")}</option>
          <option value="survival">{t("puzzles.tab.survival")}</option>
          <option value="build">{t("nav.puzzleBuild")}</option>
          <option value="leaderboard">{t("puzzles.tab.leaderboard")}</option>
        </select>
        {tab === "training" && (
          <>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/20 bg-transparent text-sm"
            >
              <option value="beginner">{t("puzzles.level.beginner")}</option>
              <option value="intermediate">{t("puzzles.level.intermediate")}</option>
              <option value="advanced">{t("puzzles.level.advanced")}</option>
              <option value="expert">{t("puzzles.level.expert")}</option>
              <option value="adaptive">{t("puzzles.difficulty.adaptive")}</option>
            </select>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/20 bg-transparent text-sm"
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

      {(tab === "rush" || tab === "storm") && (
        <div className="glass-card p-4 mb-6">
          <h3 className="font-semibold text-sm mb-2">{t("puzzles.rush.leaderboard.title")}</h3>
          {rushLeaderboard.length === 0 ? (
            <EmptyState>{t("puzzles.leaderboard.empty")}</EmptyState>
          ) : (
            <ol className="text-sm space-y-1">
              {rushLeaderboard.slice(0, 10).map((row, i) => (
                <li key={row.username} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i + 1}.{" "}
                    <a href={`/profile/${row.username}`} className="hover:text-africhess-gold hover:underline">
                      {row.display_name || row.username}
                    </a>
                  </span>
                  <span className="text-africhess-gold font-mono shrink-0">{row.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

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
            {(tab === "training" || tab === "rush" || tab === "storm") &&
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
              {tab === "training" && trainingQueue.length > 1 && (
                <PuzzleMiniStairs
                  current={trainingIndex + 1}
                  total={trainingQueue.length}
                  showError={showMiniError}
                  className="mb-2"
                />
              )}
              <PuzzleBoard
                key={`${puzzle.id}-${boardKey}`}
                puzzle={puzzle}
                onComplete={(moves) => handlePuzzleComplete(moves)}
                onWrong={handlePuzzleWrong}
                onPlayedChange={setLocalPlayed}
                disabled={puzzleSolved && !celebration && tab !== "rush" && tab !== "storm" && tab !== "survival"}
                hintRevealed={hintRevealed}
                onHintStatus={handleHintStatus}
              />
              <PuzzleSolveCelebration
                data={celebration}
                onDone={handleCelebrationDone}
                autoDismissMs={tab === "rush" || tab === "storm" || tab === "survival" ? 2400 : 3200}
              />
              <PuzzleBadgeToast
                badgeIds={badgeQueue}
                onDone={() => setBadgeQueue([])}
              />
            </div>
            <div className="space-y-4">
              <OptionSection
                compact
                title={t("board.picker.title")}
                description={t("board.picker.hint")}
                className="h-fit"
              >
                <BoardThemePicker compact showHeader={false} />
              </OptionSection>
              <OptionSection
                compact
                title={t("puzzles.settings.title")}
                description={t("puzzles.settings.hint")}
                className="h-fit"
              >
                <PuzzleSettingsPanel unlockCtx={unlockCtx} />
              </OptionSection>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <button type="button" onClick={reset} className="px-6 py-2 border rounded-lg">
              {t("puzzles.reset")}
            </button>
            {!hintRevealed && !puzzleSolved && tab !== "rush" && tab !== "storm" && tab !== "survival" && (
              <button
                type="button"
                onClick={revealHint}
                className={`px-6 py-2 rounded-lg text-sm font-medium ${
                  hintOffered
                    ? "african-gradient text-white ring-2 ring-africhess-gold/60 animate-pulse"
                    : "border border-africhess-gold text-africhess-gold hover:bg-africhess-gold/10"
                }`}
              >
                {t("puzzles.hint.button")}
              </button>
            )}
            {hintRevealed && hintAvailable === true && !puzzleSolved && tab !== "rush" && tab !== "storm" && tab !== "survival" && (
              <span className="text-sm text-africhess-gold/80">{t("puzzles.hint.shown")}</span>
            )}
            {puzzleFailed && tab !== "rush" && tab !== "storm" && tab !== "survival" && (
              <button
                type="button"
                onClick={retryPuzzle}
                className="px-6 py-2 african-gradient text-white rounded-lg font-medium"
              >
                {t("puzzles.retry")}
              </button>
            )}
            {tab === "training" && puzzleSolved && !celebration && (
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
            {(tab === "rush" || tab === "storm") && puzzle && (
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
        loadError ? (
          <EmptyState>{loadError}</EmptyState>
        ) : (
          <LoadingState label={t("puzzles.loading")} />
        )
      ) : null}

      <PuzzleSessionRecapModal
        open={recapOpen}
        recap={sessionRecap}
        onClose={() => setRecapOpen(false)}
        onReviewPuzzle={reviewPuzzle}
      />
    </div>
  );
}
