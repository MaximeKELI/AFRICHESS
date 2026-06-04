"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { puzzlesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { buildGameDisplayFromUciList } from "@/lib/chessDisplay";
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
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    puzzlesApi.daily().then(({ data }) => setPuzzle(data)).catch(() => {});
  }, []);

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
      setResult(data.solved ? "✓ Bravo, résolu !" : "✗ Ce n'est pas la bonne ligne");
    } catch {
      setResult("Connectez-vous pour valider");
    }
  };

  const reset = () => {
    setUciMoves([]);
    setResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Problème du jour</h1>
      <p className="opacity-70 mb-8">Trouvez la meilleure suite de coups</p>

      {puzzle && display ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-africhess-green/20 text-sm capitalize">
              {puzzle.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full bg-africhess-gold/20 text-sm">
              ELO {puzzle.rating}
            </span>
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
              onClick={submit}
              className="px-6 py-2 african-gradient text-white rounded-lg font-medium"
            >
              Valider
            </button>
            <button onClick={reset} className="px-6 py-2 border rounded-lg">
              Recommencer
            </button>
          </div>
          {result && <p className="mt-4 text-lg font-semibold">{result}</p>}
        </motion.div>
      ) : (
        <p>Chargement du problème…</p>
      )}
    </div>
  );
}
