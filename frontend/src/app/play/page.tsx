"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";
import Link from "next/link";

function PlayContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "blitz";
  const { user } = useAuthStore();
  const [gameId, setGameId] = useState<string | null>(null);
  const [fen, setFen] = useState("start");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [difficulty, setDifficulty] = useState(5);
  const playerColor = orientation === "white" ? "w" : "b";

  const startAI = async () => {
    try {
      const { data } = await gamesApi.createAI({ mode, difficulty, color: orientation });
      setGameId(data.id);
      setFen(data.fen);
      setStatus("Game started vs AI");
    } catch {
      setStatus("Failed to start game. Please log in.");
    }
  };

  const findMatch = async () => {
    setSearching(true);
    setStatus("Searching for opponent...");
    try {
      const { data } = await gamesApi.matchmaking(mode);
      if (data.status === "searching") {
        setStatus(`Searching... (ELO ~${data.elo})`);
      } else {
        setGameId(data.id);
        setFen(data.fen);
        setSearching(false);
        setStatus("Match found!");
      }
    } catch {
      setStatus("Matchmaking failed. Please log in.");
      setSearching(false);
    }
  };

  const handleMove = useCallback(
    async (uci: string) => {
      if (!gameId) return;
      try {
        const { data } = await gamesApi.move(gameId, uci);
        setFen(data.fen);
        if (data.status === "completed") {
          setStatus(`Game over: ${data.result || "Finished"}`);
        }
      } catch {
        setStatus("Invalid move");
      }
    },
    [gameId]
  );

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="mb-4">Please log in to play online.</p>
        <Link href="/login" className="text-africhess-gold underline">Log In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6 capitalize">Play {mode}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            onMove={handleMove}
            disabled={!gameId}
            playerColor={playerColor as "w" | "b"}
          />
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Play vs Computer</h2>
            <label className="text-sm block mb-2">Difficulty: {difficulty}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full mb-3"
            />
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as "white" | "black")}
              className="w-full mb-3 border rounded-lg px-3 py-2 bg-transparent"
            >
              <option value="white">Play as White</option>
              <option value="black">Play as Black</option>
            </select>
            <button onClick={startAI} className="w-full py-2 rounded-lg african-gradient text-white font-medium">
              Start AI Game
            </button>
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Find Opponent</h2>
            <button
              onClick={findMatch}
              disabled={searching}
              className="w-full py-2 rounded-lg border-2 border-africhess-green text-africhess-green font-medium hover:bg-africhess-green/10 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Find Match"}
            </button>
          </div>

          {status && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-africhess-gold">
              {status}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PlayContent />
    </Suspense>
  );
}
