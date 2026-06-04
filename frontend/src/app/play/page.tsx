"use client";

import { useState, useCallback, Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { AiCommentaryPanel } from "@/components/chess/AiCommentaryPanel";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { GameClock } from "@/components/chess/GameClock";
import { GameAnalysisPanel } from "@/components/chess/GameAnalysisPanel";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { CHESS_LEVELS } from "@/lib/avatars";
import { defaultAiEloForLevel, type AiLevelElo } from "@/lib/aiStrength";
import { AiStrengthPicker } from "@/components/chess/AiStrengthPicker";
import {
  buildGameDisplayFromFen,
  buildGameDisplayFromMoves,
  commentsFromMoves,
  type ApiMove,
} from "@/lib/chessDisplay";
import { usePreferencesStore } from "@/store/preferences";
import { useGameClock } from "@/hooks/useGameClock";
import { MODE_CLOCK_LABEL } from "@/lib/clock";
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
} from "@/lib/gameStorage";
import { openingNameFromMoves } from "@/lib/openings";
import { motion } from "framer-motion";
import Link from "next/link";
import { GameChat } from "@/components/social/GameChat";
import { useGameWebSocket, useMatchmakingWebSocket } from "@/hooks/useGameWebSocket";

interface GameState {
  fen: string;
  moves?: ApiMove[];
  white_time_ms?: number;
  black_time_ms?: number;
  increment_ms?: number;
  status?: string;
  result?: string;
  is_vs_ai?: boolean;
  ai_target_elo?: number;
}

function PlayContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "blitz";
  const gameFromUrl = params.get("game");
  const { user } = useAuthStore();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameState>({ fen: "start", moves: [] });
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [aiEloChoice, setAiEloChoice] = useState<AiLevelElo>(1200);
  const [userElo, setUserElo] = useState<number | null>(null);
  const [aiElo, setAiElo] = useState<number | null>(null);
  const [isVsAi, setIsVsAi] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<ReturnType<typeof loadActiveGame>>(null);
  const { aiCommentsEnabled } = usePreferencesStore();
  const turnStartRef = useRef(Date.now());

  const playerColor = orientation === "white" ? "w" : "b";
  const playerIsWhite = orientation === "white";
  const levelLabel = CHESS_LEVELS.find((l) => l.id === user?.chess_level)?.label;
  const gameActive = gameId && gameData.status === "active";
  const gameCompleted = gameData.status === "completed";
  const isLiveHuman = Boolean(gameId && !isVsAi);

  const display = useMemo(() => {
    if (gameData.moves && gameData.moves.length > 0) {
      return buildGameDisplayFromMoves("start", gameData.moves);
    }
    return buildGameDisplayFromFen(gameData.fen);
  }, [gameData]);

  const { white: clockWhite, black: clockBlack } = useGameClock(
    gameData.white_time_ms ?? 180000,
    gameData.black_time_ms ?? 180000,
    display.turn,
    Boolean(gameActive)
  );

  const openingName = useMemo(() => {
    const sans = gameData.moves?.map((m) => m.san) ?? [];
    return openingNameFromMoves(sans);
  }, [gameData.moves]);

  const moveComments = useMemo(() => {
    if (!gameData.moves?.length) return [];
    return commentsFromMoves(gameData.moves, playerIsWhite);
  }, [gameData.moves, playerIsWhite]);

  useEffect(() => {
    if (user?.chess_level) {
      setAiEloChoice(defaultAiEloForLevel(user.chess_level));
    }
  }, [user?.chess_level]);

  useEffect(() => {
    if (!user) return;
    gamesApi
      .aiPreview(mode, aiEloChoice)
      .then(({ data }) => {
        setUserElo(data.user_elo);
        setAiElo(data.ai_target_elo);
      })
      .catch(() => {});
  }, [user, mode, aiEloChoice]);

  useEffect(() => {
    const saved = loadActiveGame();
    if (saved && !gameId) setResumeOffer(saved);
  }, [user, gameId]);

  useEffect(() => {
    turnStartRef.current = Date.now();
  }, [display.turn, gameData.white_time_ms, gameData.black_time_ms]);

  const applyGameResponse = (data: GameState & { id?: string }) => {
    setGameData({
      fen: data.fen,
      moves: data.moves ?? [],
      white_time_ms: data.white_time_ms,
      black_time_ms: data.black_time_ms,
      increment_ms: data.increment_ms,
      status: data.status,
      result: data.result,
      is_vs_ai: data.is_vs_ai,
      ai_target_elo: data.ai_target_elo,
    });
    if (data.ai_target_elo) setAiElo(data.ai_target_elo);
    if (data.is_vs_ai !== undefined) setIsVsAi(data.is_vs_ai);
    if (data.status === "completed") clearActiveGame();
  };

  const handleWsUpdate = useCallback(
    (payload: { game: GameState & { id?: string; moves?: ApiMove[] } }) => {
      const g = payload.game;
      applyGameResponse({
        fen: g.fen,
        moves: g.moves ?? [],
        white_time_ms: g.white_time_ms,
        black_time_ms: g.black_time_ms,
        increment_ms: g.increment_ms,
        status: g.status,
        result: g.result,
        is_vs_ai: g.is_vs_ai,
      });
    },
    []
  );

  const { connected: wsConnected, sendMove: wsSendMove } = useGameWebSocket(
    gameId,
    isLiveHuman,
    handleWsUpdate,
    (payload) => {
      setStatus(`Fin de partie : ${payload.game.result || "Terminée"}`);
    }
  );

  const handleMatchFound = useCallback(
    (id: string) => {
      setGameId(id);
      setIsVsAi(false);
      setSearching(false);
      gamesApi.get(id).then(({ data }) => {
        if (data.white_player?.id === user?.id) setOrientation("white");
        else if (data.black_player?.id === user?.id) setOrientation("black");
        applyGameResponse(data);
        setStatus("Adversaire trouvé — partie en direct !");
      });
    },
    [user?.id]
  );

  const { searching: wsSearching, search: wsSearch, cancel: wsCancel } =
    useMatchmakingWebSocket(Boolean(user), mode, handleMatchFound);

  const isMyTurn =
    gameActive &&
    ((display.turn === "w" && playerIsWhite) ||
      (display.turn === "b" && !playerIsWhite));

  useEffect(() => {
    if (!user || !gameFromUrl) return;
    gamesApi
      .get(gameFromUrl)
      .then(({ data }) => {
        setGameId(data.id);
        setIsVsAi(Boolean(data.is_vs_ai));
        if (data.white_player?.id === user.id) setOrientation("white");
        else if (data.black_player?.id === user.id) setOrientation("black");
        applyGameResponse(data);
        setStatus("Partie chargée");
      })
      .catch(() => setStatus("Partie introuvable"));
  }, [user, gameFromUrl]);

  const resumeGame = async () => {
    if (!resumeOffer) return;
    try {
      const { data } = await gamesApi.get(resumeOffer.gameId);
      setGameId(data.id);
      setOrientation(resumeOffer.orientation);
      setAiEloChoice(resumeOffer.aiElo as AiLevelElo);
      setIsVsAi(true);
      applyGameResponse(data);
      setResumeOffer(null);
      setStatus("Partie reprise");
    } catch {
      clearActiveGame();
      setResumeOffer(null);
    }
  };

  const startAI = async () => {
    try {
      const { data } = await gamesApi.createAI({
        mode,
        ai_elo: aiEloChoice,
        color: orientation,
        include_comments: aiCommentsEnabled,
      });
      setIsVsAi(true);
      setGameId(data.id);
      applyGameResponse(data);
      saveActiveGame({
        gameId: data.id,
        mode,
        orientation,
        aiElo: aiEloChoice,
        savedAt: Date.now(),
      });
      setStatus(
        data.ai_target_elo
          ? `Partie lancée — IA ~${data.ai_target_elo} ELO`
          : "Partie lancée vs IA"
      );
    } catch {
      setStatus("Échec du lancement. Connectez-vous.");
    }
  };

  const handleUndo = async () => {
    if (!gameId || !isVsAi) return;
    try {
      const { data } = await gamesApi.undo(gameId);
      applyGameResponse(data);
      setStatus("Coup annulé");
    } catch {
      setStatus("Impossible d'annuler");
    }
  };

  const handleMove = useCallback(
    async (uci: string) => {
      if (!gameId) return;
      const spentMs = Date.now() - turnStartRef.current;
      try {
        const { data } = await gamesApi.move(gameId, uci, {
          includeComments: isVsAi && aiCommentsEnabled,
          spentMs,
        });
        applyGameResponse(data);
        if (data.status === "completed") {
          setStatus(`Fin de partie : ${data.result || "Terminée"}`);
        }
      } catch {
        setStatus("Coup invalide ou temps écoulé");
      }
    },
    [gameId, isVsAi, aiCommentsEnabled]
  );

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
      <h1 className="font-display text-3xl font-bold mb-6 capitalize">
        Jouer — {mode}
      </h1>

      {resumeOffer && !gameId && (
        <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Partie en cours sauvegardée ({resumeOffer.mode}, IA {resumeOffer.aiElo})
          </p>
          <div className="flex gap-2">
            <button
              onClick={resumeGame}
              className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
            >
              Reprendre
            </button>
            <button
              onClick={() => {
                clearActiveGame();
                setResumeOffer(null);
              }}
              className="px-4 py-2 rounded-lg border text-sm opacity-70"
            >
              Nouvelle partie
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_260px] gap-6">
        <div className="space-y-3">
          {gameId && (
            <GameClock
              whiteMs={clockWhite}
              blackMs={clockBlack}
              turn={display.turn}
              running={Boolean(gameActive)}
              orientation={orientation}
              incrementMs={gameData.increment_ms ?? 0}
              label={MODE_CLOCK_LABEL[mode] ?? mode}
            />
          )}
          <ChessBoard
            fen={display.fen}
            orientation={orientation}
            onMove={handleMove}
            disabled={!gameId || gameCompleted}
            playerColor={playerColor as "w" | "b"}
            lastMove={display.lastMove}
            playSoundOnFenChange={true}
          />
          {isVsAi && gameActive && (
            <button
              type="button"
              onClick={handleUndo}
              className="w-full max-w-[560px] mx-auto block py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5"
            >
              ↩ Annuler le dernier coup (ou 2 avec réponse IA)
            </button>
          )}
        </div>

        <div className="space-y-4">
          <GameSidePanel
            moves={display.moveRows}
            captured={display.captured}
            orientation={orientation}
            isCheck={display.isCheck}
            turn={display.turn}
            openingName={openingName}
          />
          {isVsAi && (
            <div className="glass-card p-4">
              <h3 className="font-semibold text-sm mb-3">Commentaires</h3>
              <AiCommentaryPanel
                comments={moveComments}
                enabled={aiCommentsEnabled}
              />
            </div>
          )}
          {gameId && (
            <GameAnalysisPanel gameId={gameId} completed={gameCompleted} />
          )}
          {gameId && !isVsAi && <GameChat gameId={gameId} />}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Jouer vs l&apos;ordinateur</h2>
            {levelLabel && (
              <p className="text-xs opacity-60 mb-2">Votre niveau : {levelLabel}</p>
            )}
            <div className="flex justify-between text-xs mb-2 gap-2">
              <span className="opacity-70">
                Votre ELO :{" "}
                <strong className="text-africhess-green">{userElo ?? "—"}</strong>
              </span>
              <span className="opacity-70">
                IA : <strong className="text-africhess-gold">{aiElo ?? "—"}</strong>
              </span>
            </div>
            <div className="mb-3 border-t border-white/10 pt-3">
              <AiStrengthPicker value={aiEloChoice} onChange={setAiEloChoice} />
            </div>
            <select
              value={orientation}
              onChange={(e) =>
                setOrientation(e.target.value as "white" | "black")
              }
              className="w-full mb-3 border rounded-lg px-3 py-2 bg-transparent"
            >
              <option value="white">Blancs</option>
              <option value="black">Noirs</option>
            </select>
            <div className="mb-3 py-2 border-t border-white/10">
              <CommentsToggle />
            </div>
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
