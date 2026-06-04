"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { puzzlesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { buildGameDisplayFromUciList } from "@/lib/chessDisplay";
import { getPuzzleStreak, recordPuzzleSolved } from "@/lib/puzzleStreak";
import { motion } from "framer-motion";

interface Puzzle {
  id: number;
  fen: string;
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

type Tab = "daily" | "training" | "rush" | "leaderboard";

export default function PuzzlesPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [trainingQueue, setTrainingQueue] = useState<Puzzle[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [rushQueue, setRushQueue] = useState<Puzzle[]>([]);
  const [rushIndex, setRushIndex] = useState(0);
  const [rushScore, setRushScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    setStreak(getPuzzleStreak());
  }, []);

  const loadDaily = () => {
    setResult(null);
    setUciMoves([]);
    setStartTime(Date.now());
    puzzlesApi.daily().then(({ data }) => setPuzzle(data)).catch(() => setPuzzle(null));
  };

  const loadRush = () => {
    setResult(null);
    setUciMoves([]);
    setStartTime(Date.now());
    setRushScore(0);
    puzzlesApi
      .rush(5)
      .then(({ data }) => {
        const list: Puzzle[] = Array.isArray(data) ? data : data.results ?? [];
        setRushQueue(list);
        setRushIndex(0);
        setPuzzle(list[0] ?? null);
      })
      .catch(() => setPuzzle(null));
  };

  const loadLeaderboard = () => {
    puzzlesApi
      .leaderboard()
      .then(({ data }) =>
        setLeaderboard(Array.isArray(data) ? data : [])
      )
      .catch(() => setLeaderboard([]));
  };

  const loadTraining = () => {
    setResult(null);
    setUciMoves([]);
    setStartTime(Date.now());
    puzzlesApi
      .training(difficulty, 10)
      .then(({ data }) => {
        const list: Puzzle[] = Array.isArray(data) ? data : data.results ?? [];
        setTrainingQueue(list);
        setTrainingIndex(0);
        setPuzzle(list[0] ?? null);
      })
      .catch(() => setPuzzle(null));
  };

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else if (tab === "training") loadTraining();
    else if (tab === "rush") loadRush();
    else if (tab === "leaderboard") loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, difficulty]);

  const display = useMemo(() => {
    if (!puzzle) return null;
    return buildGameDisplayFromUciList(puzzle.fen, uciMoves);
  }, [puzzle, uciMoves]);

  const handleMove = useCallback((uci: string) => {
    setUciMoves((prev) => [...prev, uci]);
  }, []);

  const submit = async () => {
    if (!puzzle || !user) return;
    const time = Math.floor((Date.now() - startTime) / 1000);
    try {
      const { data } = await puzzlesApi.submit(puzzle.id, uciMoves, time);
      const solved = Boolean(data.solved);
      const nextStreak = recordPuzzleSolved(solved);
      setStreak(nextStreak);
      if (tab === "rush" && solved) setRushScore((s) => s + 1);
      setResult(
        solved
          ? `✓ Bravo ! Série : ${nextStreak}${tab === "rush" ? ` — Rush : ${rushScore + (solved ? 1 : 0)}/5` : ""}`
          : "✗ Ce n'est pas la bonne ligne"
      );
      if (tab === "rush" && result === null) {
        /* rush advance handled in nextRush */
      }
    } catch {
      setResult("Connectez-vous pour valider");
    }
  };

  const reset = () => {
    setUciMoves([]);
    setResult(null);
    setStartTime(Date.now());
  };

  const nextRush = () => {
    const next = rushIndex + 1;
    if (next < rushQueue.length) {
      setRushIndex(next);
      setPuzzle(rushQueue[next]);
      reset();
    } else {
      setResult(`Rush terminé — ${rushScore}/5 résolus`);
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
      <h1 className="font-display text-3xl font-bold mb-2">Problèmes</h1>
      <p className="opacity-70 mb-4">
        Problème du jour et entraînement par niveau
        {streak > 0 && (
          <span className="ml-2 text-africhess-gold">🔥 Série : {streak}</span>
        )}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("daily")}
          className={`px-4 py-2 rounded-lg ${tab === "daily" ? "african-gradient text-white" : "border"}`}
        >
          Du jour
        </button>
        <button
          type="button"
          onClick={() => setTab("training")}
          className={`px-4 py-2 rounded-lg ${tab === "training" ? "african-gradient text-white" : "border"}`}
        >
          Entraînement
        </button>
        <button
          type="button"
          onClick={() => setTab("rush")}
          className={`px-4 py-2 rounded-lg ${tab === "rush" ? "african-gradient text-white" : "border"}`}
        >
          Rush (5)
        </button>
        <button
          type="button"
          onClick={() => setTab("leaderboard")}
          className={`px-4 py-2 rounded-lg ${tab === "leaderboard" ? "african-gradient text-white" : "border"}`}
        >
          Classement
        </button>
        {tab === "training" && (
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-transparent text-sm"
          >
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
            <option value="expert">Expert</option>
          </select>
        )}
      </div>

      {tab === "leaderboard" && (
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">Top résolveurs</h2>
          {leaderboard.length === 0 ? (
            <p className="opacity-60">Aucun score enregistré</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((row) => (
                <li
                  key={row.rank}
                  className="flex justify-between text-sm border-b border-white/5 pb-2"
                >
                  <span>
                    {row.rank}. {row.display_name || row.username}
                  </span>
                  <span className="text-africhess-gold">{row.solved_count} résolus</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab !== "leaderboard" && puzzle && display ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={puzzle.id}>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-africhess-green/20 text-sm capitalize">
              {puzzle.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full bg-africhess-gold/20 text-sm">
              ELO {puzzle.rating}
            </span>
            {tab === "training" && trainingQueue.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {trainingIndex + 1}/{trainingQueue.length}
              </span>
            )}
            {puzzle.themes?.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {t}
              </span>
            ))}
          </div>

          <div className="grid md:grid-cols-[1fr_240px_200px] gap-6">
            <ChessBoard
              fen={display.fen}
              onMove={handleMove}
              orientation="white"
              playerColor="w"
              lastMove={display.lastMove}
              playSoundOnFenChange={false}
            />
            <GameSidePanel
              moves={display.moveRows}
              captured={display.captured}
              orientation="white"
              isCheck={display.isCheck}
              turn={display.turn}
            />
            <div className="glass-card p-4 h-fit">
              <BoardThemePicker compact />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={submit}
              className="px-6 py-2 african-gradient text-white rounded-lg font-medium"
            >
              Valider
            </button>
            <button type="button" onClick={reset} className="px-6 py-2 border rounded-lg">
              Recommencer
            </button>
            {tab === "training" && result?.startsWith("✓") && (
              <button
                type="button"
                onClick={nextTraining}
                className="px-6 py-2 border border-africhess-green text-africhess-green rounded-lg"
              >
                Suivant →
              </button>
            )}
            {tab === "rush" && result && (
              <button
                type="button"
                onClick={nextRush}
                className="px-6 py-2 border border-africhess-green text-africhess-green rounded-lg"
              >
                Suivant rush →
              </button>
            )}
          </div>
          {result && <p className="mt-4 text-lg font-semibold">{result}</p>}
        </motion.div>
      ) : (
        <p>Chargement du problème…</p>
      )}
    </div>
  );
}
