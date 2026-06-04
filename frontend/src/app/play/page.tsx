"use client";

import { useState, useCallback, Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { AiCommentaryPanel } from "@/components/chess/AiCommentaryPanel";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { levelToAiDifficulty, CHESS_LEVELS } from "@/lib/avatars";
import {
  buildGameDisplayFromFen,
  buildGameDisplayFromMoves,
  commentsFromMoves,
  type ApiMove,
} from "@/lib/chessDisplay";
import { usePreferencesStore } from "@/store/preferences";
import { motion } from "framer-motion";
import Link from "next/link";

interface GameData {
  fen: string;
  moves?: ApiMove[];
}

function PlayContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "blitz";
  const { user } = useAuthStore();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData>({ fen: "start", moves: [] });
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [difficulty, setDifficulty] = useState(5);
  const [userElo, setUserElo] = useState<number | null>(null);
  const [aiElo, setAiElo] = useState<number | null>(null);
  const playerColor = orientation === "white" ? "w" : "b";
  const levelLabel = CHESS_LEVELS.find((l) => l.id === user?.chess_level)?.label;

  const display = useMemo(() => {
    if (gameData.moves && gameData.moves.length > 0) {
      return buildGameDisplayFromMoves("start", gameData.moves);
    }
    return buildGameDisplayFromFen(gameData.fen);
  }, [gameData]);

  useEffect(() => {
    if (user?.chess_level) {
      setDifficulty(levelToAiDifficulty(user.chess_level));
    }
  }, [user?.chess_level]);

  useEffect(() => {
    if (!user) return;
    gamesApi
      .aiPreview(mode, difficulty)
      .then(({ data }) => {
        setUserElo(data.user_elo);
        setAiElo(data.ai_target_elo);
      })
      .catch(() => {});
  }, [user, mode, difficulty]);

  const applyGameResponse = (data: { fen: string; moves?: ApiMove[]; ai_target_elo?: number; status?: string; result?: string }) => {
    setGameData({ fen: data.fen, moves: data.moves ?? [] });
    if (data.ai_target_elo) setAiElo(data.ai_target_elo);
  };

  const startAI = async () => {
    try {
      const { data } = await gamesApi.createAI({ mode, difficulty, color: orientation });
      setGameId(data.id);
      applyGameResponse(data);
      setStatus(
        data.ai_target_elo
          ? `Partie lancée — IA ~${data.ai_target_elo} ELO`
          : "Partie lancée vs IA"
      );
    } catch {
      setStatus("Échec du lancement. Connectez-vous.");
    }
  };

  const findMatch = async () => {
    setSearching(true);
    setStatus("Recherche d'un adversaire…");
    try {
      const { data } = await gamesApi.matchmaking(mode);
      if (data.status === "searching") {
        setStatus(`Recherche adversaire proche de ${data.elo} ELO…`);
      } else {
        setGameId(data.id);
        applyGameResponse(data);
        setSearching(false);
        setStatus("Adversaire trouvé !");
      }
    } catch {
      setStatus("Matchmaking échoué.");
      setSearching(false);
    }
  };

  const handleMove = useCallback(
    async (uci: string) => {
      if (!gameId) return;
      try {
        const { data } = await gamesApi.move(gameId, uci);
        applyGameResponse(data);
        if (data.status === "completed") {
          setStatus(`Fin de partie : ${data.result || "Terminée"}`);
        }
      } catch {
        setStatus("Coup invalide");
      }
    },
    [gameId]
  );

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="mb-4">Connectez-vous pour jouer en ligne.</p>
        <Link href="/login" className="text-africhess-gold underline">
          Connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6 capitalize">Jouer — {mode}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_260px] gap-6">
        <div className="lg:col-span-1">
          <ChessBoard
            fen={display.fen}
            orientation={orientation}
            onMove={handleMove}
            disabled={!gameId}
            playerColor={playerColor as "w" | "b"}
            lastMove={display.lastMove}
            playSoundOnFenChange={true}
          />
        </div>

        <GameSidePanel
          moves={display.moveRows}
          captured={display.captured}
          orientation={orientation}
          isCheck={display.isCheck}
          turn={display.turn}
        />

        <div className="space-y-4">
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Jouer vs l&apos;ordinateur</h2>
            {levelLabel && (
              <p className="text-xs opacity-60 mb-2">Votre niveau : {levelLabel}</p>
            )}
            <div className="flex justify-between text-xs mb-2 gap-2">
              <span className="opacity-70">
                Votre ELO : <strong className="text-africhess-green">{userElo ?? "—"}</strong>
              </span>
              <span className="opacity-70">
                IA : <strong className="text-africhess-gold">{aiElo ?? "—"}</strong>
              </span>
            </div>
            <label className="text-sm block mb-2">Force IA : {difficulty}/10</label>
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
              <option value="white">Blancs</option>
              <option value="black">Noirs</option>
            </select>
            <button
              onClick={startAI}
              className="w-full py-2 rounded-lg african-gradient text-white font-medium"
            >
              Lancer la partie
            </button>
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Joueur en ligne</h2>
            <button
              onClick={findMatch}
              disabled={searching}
              className="w-full py-2 rounded-lg border-2 border-africhess-green text-africhess-green font-medium hover:bg-africhess-green/10 disabled:opacity-50"
            >
              {searching ? "Recherche…" : "Trouver un adversaire"}
            </button>
          </div>

          <div className="glass-card p-4">
            <BoardThemePicker compact />
          </div>

          {status && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-africhess-gold"
            >
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
    <Suspense fallback={<div className="p-8 text-center">Chargement…</div>}>
      <PlayContent />
    </Suspense>
  );
}
