"use client";

import { useEffect, useState, useCallback } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { puzzlesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";

interface Puzzle {
  id: number;
  fen: string;
  themes: string[];
  difficulty: string;
  rating: number;
}

export default function PuzzlesPage() {
  const { user } = useAuthStore();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    puzzlesApi.daily().then(({ data }) => setPuzzle(data)).catch(() => {});
  }, []);

  const handleMove = useCallback(
    (uci: string) => {
      if (!puzzle) return;
      const newMoves = [...moves, uci];
      setMoves(newMoves);
    },
    [moves, puzzle]
  );

  const submit = async () => {
    if (!puzzle || !user) return;
    const time = Math.floor((Date.now() - startTime) / 1000);
    try {
      const { data } = await puzzlesApi.submit(puzzle.id, moves, time);
      setResult(data.solved ? "✓ Solved!" : "✗ Try again");
    } catch {
      setResult("Login required to submit");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Daily Puzzle</h1>
      <p className="opacity-70 mb-8">Find the best move sequence</p>

      {puzzle ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-africhess-green/20 text-sm capitalize">{puzzle.difficulty}</span>
            <span className="px-3 py-1 rounded-full bg-africhess-gold/20 text-sm">Rating: {puzzle.rating}</span>
            {puzzle.themes?.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-sm">{t}</span>
            ))}
          </div>
          <ChessBoard fen={puzzle.fen} onMove={handleMove} orientation="white" />
          <div className="mt-6 flex gap-4">
            <button onClick={submit} className="px-6 py-2 african-gradient text-white rounded-lg font-medium">
              Submit Solution
            </button>
            <button onClick={() => { setMoves([]); setResult(null); }} className="px-6 py-2 border rounded-lg">
              Reset
            </button>
          </div>
          {result && <p className="mt-4 text-lg font-semibold">{result}</p>}
          <p className="mt-2 text-sm opacity-60">Moves: {moves.join(", ") || "none"}</p>
        </motion.div>
      ) : (
        <p>Loading puzzle...</p>
      )}
    </div>
  );
}
