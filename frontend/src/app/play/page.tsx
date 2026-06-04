"use client";

import { useState, useCallback, Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { AiCommentaryPanel } from "@/components/chess/AiCommentaryPanel";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { GameAnalysisPanel } from "@/components/chess/GameAnalysisPanel";
import { PlayBoardSection } from "@/components/play/PlayBoardSection";
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
import { formatTimeControlLabel } from "@/lib/timeControl";
import {
  DEFAULT_TIME_MINUTES,
  type TimeMinutes,
} from "@/lib/timeControl";
import { turnFromFen } from "@/lib/gameDisplayFast";
import { TimeControlPicker } from "@/components/chess/TimeControlPicker";
import { playDrawWhistle } from "@/lib/chessSounds";
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
} from "@/lib/gameStorage";
import { openingNameFromMoves } from "@/lib/openings";
import Link from "next/link";
import { GameChat } from "@/components/social/GameChat";
import {
  useGameWebSocket,
  useMatchmakingWebSocket,
  type WsGamePayload,
} from "@/hooks/useGameWebSocket";

interface GameState {
  fen: string;
  moves?: ApiMove[];
  white_time_ms?: number;
  black_time_ms?: number;
  increment_ms?: number;
  status?: string;
  result?: string;
  termination_reason?: string;
  is_timed?: boolean;
  time_control_minutes?: number | null;
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
  const [aiEloChoice, setAiEloChoice] = useState<AiLevelElo>(250);
  const [useClock, setUseClock] = useState(true);
  const [timeMinutes, setTimeMinutes] = useState<TimeMinutes>(DEFAULT_TIME_MINUTES);
  const [userElo, setUserElo] = useState<number | null>(null);
  const [aiElo, setAiElo] = useState<number | null>(null);
  const [isVsAi, setIsVsAi] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<ReturnType<typeof loadActiveGame>>(null);
  const [movePending, setMovePending] = useState(false);
  const { aiCommentsEnabled } = usePreferencesStore();
  const turnStartRef = useRef(Date.now());

  const playerColor = orientation === "white" ? "w" : "b";
  const playerIsWhite = orientation === "white";
  const levelLabel = CHESS_LEVELS.find((l) => l.id === user?.chess_level)?.label;
  const gameActive = gameId && gameData.status === "active";
  const gameCompleted = gameData.status === "completed";
  const isLiveHuman = Boolean(gameId && !isVsAi);
  const gameIsTimed = gameData.is_timed !== false;
  const clockLabel = formatTimeControlLabel(
    gameIsTimed,
    gameData.time_control_minutes ?? timeMinutes
  );
  const timeOpts = useMemo(
    () => ({ isTimed: useClock, timeMinutes }),
    [useClock, timeMinutes]
  );

  const panelDisplay = useMemo(() => {
    if (gameData.moves && gameData.moves.length > 0) {
      return buildGameDisplayFromMoves("start", gameData.moves);
    }
    return buildGameDisplayFromFen(gameData.fen);
  }, [gameData.fen, gameData.moves]);

  const turn = turnFromFen(gameData.fen);

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
  }, [turn, gameData.white_time_ms, gameData.black_time_ms]);

  const applyGameResponse = useCallback((data: GameState & { id?: string }) => {
    if (data.termination_reason === "repetition") {
      playDrawWhistle();
    }
    setGameData({
      fen: data.fen,
      moves: data.moves ?? [],
      white_time_ms: data.white_time_ms,
      black_time_ms: data.black_time_ms,
      increment_ms: data.increment_ms,
      status: data.status,
      result: data.result,
      termination_reason: data.termination_reason,
      is_timed: data.is_timed,
      time_control_minutes: data.time_control_minutes,
      is_vs_ai: data.is_vs_ai,
      ai_target_elo: data.ai_target_elo,
    });
    if (data.ai_target_elo) setAiElo(data.ai_target_elo);
    if (data.is_vs_ai !== undefined) setIsVsAi(data.is_vs_ai);
    if (data.status === "completed") {
      clearActiveGame();
      if (data.termination_reason === "repetition") {
        setStatus("Nulle — même position 3 fois (répétition)");
      } else if (data.result) {
        setStatus(`Fin de partie : ${data.result}`);
      }
    }
  }, []);

  const wsPendingRef = useRef<WsGamePayload | null>(null);
  const wsRafRef = useRef(0);

  const handleWsUpdate = useCallback(
    (payload: WsGamePayload) => {
      wsPendingRef.current = payload;
      if (wsRafRef.current) return;
      wsRafRef.current = requestAnimationFrame(() => {
        wsRafRef.current = 0;
        const p = wsPendingRef.current;
        if (!p) return;
        const g = p.game;
        applyGameResponse({
          fen: g.fen,
          moves: (g.moves ?? []) as ApiMove[],
          white_time_ms: g.white_time_ms,
          black_time_ms: g.black_time_ms,
          increment_ms: g.increment_ms,
          status: g.status,
          result: g.result,
          is_vs_ai: g.is_vs_ai,
        });
      });
    },
    [applyGameResponse]
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
    useMatchmakingWebSocket(Boolean(user), mode, handleMatchFound, timeOpts);

  const isMyTurn =
    gameActive &&
    ((turn === "w" && playerIsWhite) || (turn === "b" && !playerIsWhite));

  const applyOptimisticUci = useCallback((uci: string) => {
    setGameData((prev) => {
      try {
        const chess = new Chess(prev.fen === "start" ? undefined : prev.fen);
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
        const m = chess.move({ from, to, promotion });
        if (!m) return prev;
        return { ...prev, fen: chess.fen() };
      } catch {
        return prev;
      }
    });
  }, []);

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
        is_timed: useClock,
        time_minutes: useClock ? timeMinutes : null,
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
      if (!gameId || gameCompleted) return;
      const poolMs = playerIsWhite ? gameData.white_time_ms : gameData.black_time_ms;
      const spentMs = gameIsTimed
        ? Math.min(Date.now() - turnStartRef.current, poolMs ?? 999_999)
        : undefined;
      applyOptimisticUci(uci);
      turnStartRef.current = Date.now();

      if (isLiveHuman && wsConnected) {
        const sent = wsSendMove(uci, spentMs);
        if (sent) return;
      }

      setMovePending(true);
      try {
        const { data } = await gamesApi.move(gameId, uci, {
          includeComments: isVsAi && aiCommentsEnabled,
          spentMs,
        });
        applyGameResponse(data);
        if (data.status === "completed" && data.termination_reason !== "repetition") {
          setStatus(`Fin de partie : ${data.result || "Terminée"}`);
        }
      } catch {
        gamesApi.get(gameId).then(({ data }) => applyGameResponse(data)).catch(() => {});
        setStatus("Coup invalide ou temps écoulé");
      } finally {
        setMovePending(false);
      }
    },
    [
      gameId,
      gameCompleted,
      isVsAi,
      aiCommentsEnabled,
      isLiveHuman,
      wsConnected,
      wsSendMove,
      applyOptimisticUci,
      applyGameResponse,
      gameIsTimed,
    ]
  );

  const findMatch = async () => {
    setSearching(true);
    setStatus(
      useClock
        ? `Recherche (${timeMinutes} min)…`
        : "Recherche sans limite de temps…"
    );
    try {
      await gamesApi.matchmaking(mode, {
        is_timed: useClock,
        time_minutes: useClock ? timeMinutes : null,
      });
    } catch {
      /* file HTTP optionnelle ; WS principal */
    }
    wsSearch();
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
          {isLiveHuman && (
            <p className="text-xs text-center opacity-60">
              {wsConnected ? "● En direct (WebSocket)" : "○ Connexion temps réel…"}
            </p>
          )}
          {movePending && isVsAi && (
            <p className="text-xs text-center text-africhess-gold animate-pulse">
              L&apos;IA réfléchit…
            </p>
          )}
          <PlayBoardSection
            fen={gameData.fen}
            moves={gameData.moves}
            orientation={orientation}
            onMove={handleMove}
            disabled={!gameId || gameCompleted || movePending || (isLiveHuman && !isMyTurn)}
            playerColor={playerColor as "w" | "b"}
            showClock={Boolean(gameId && gameIsTimed)}
            whiteMs={gameData.white_time_ms ?? timeMinutes * 60_000}
            blackMs={gameData.black_time_ms ?? timeMinutes * 60_000}
            clockRunning={Boolean(
              gameActive &&
                gameIsTimed &&
                (isVsAi ? isMyTurn && !movePending : true)
            )}
            incrementMs={gameData.increment_ms ?? 0}
            clockLabel={clockLabel}
          />
          {isLiveHuman && gameActive && (
            <div className="flex flex-wrap gap-2 justify-center max-w-[560px] mx-auto">
              <button
                type="button"
                onClick={() => gameId && gamesApi.offerDraw(gameId)}
                className="text-xs px-3 py-1 rounded border border-white/20"
              >
                Proposer nulle
              </button>
              <button
                type="button"
                onClick={() =>
                  gameId &&
                  gamesApi.respondDraw(gameId, true).then(({ data }) => applyGameResponse(data))
                }
                className="text-xs px-3 py-1 rounded border border-africhess-green text-africhess-green"
              >
                Accepter nulle
              </button>
            </div>
          )}
          {isLiveHuman && gameCompleted && gameId && (
            <button
              type="button"
              onClick={() =>
                gamesApi.rematch(gameId).then(({ data }) => {
                  setGameId(data.id);
                  applyGameResponse(data);
                  setStatus("Revanche lancée");
                })
              }
              className="w-full max-w-[560px] mx-auto block py-2 text-sm rounded-lg african-gradient text-white"
            >
              Revanche
            </button>
          )}
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
            moves={panelDisplay.moveRows}
            captured={panelDisplay.captured}
            orientation={orientation}
            isCheck={panelDisplay.isCheck}
            turn={panelDisplay.turn}
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
            <TimeControlPicker
              isTimed={useClock}
              minutes={timeMinutes}
              onTimedChange={setUseClock}
              onMinutesChange={setTimeMinutes}
            />
          </div>

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
              disabled={searching || wsSearching}
              className="w-full py-2 rounded-lg border-2 border-africhess-green text-africhess-green font-medium hover:bg-africhess-green/10 disabled:opacity-50"
            >
              {searching || wsSearching ? "Recherche…" : "Trouver un adversaire"}
            </button>
            {(searching || wsSearching) && (
              <button
                type="button"
                onClick={() => {
                  wsCancel();
                  gamesApi.leaveQueue().catch(() => {});
                  setSearching(false);
                  setStatus("Recherche annulée");
                }}
                className="w-full mt-2 py-1 text-xs opacity-60 hover:opacity-100"
              >
                Annuler
              </button>
            )}
          </div>

          <div className="glass-card p-4">
            <BoardThemePicker compact />
          </div>

          {status && (
            <p className="text-sm text-africhess-gold">{status}</p>
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
