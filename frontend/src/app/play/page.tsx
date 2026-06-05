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
import { defaultAiEloForUser, normalizeToPreset, type AiLevelElo } from "@/lib/aiStrength";
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
import { formatApiError } from "@/lib/errors";
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
} from "@/lib/gameStorage";
import { openingNameFromMoves } from "@/lib/openings";
import Link from "next/link";
import Image from "next/image";
import { pickAiAvatar } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelLabel, modeLabel } from "@/lib/i18n/labels";
import { GameChat } from "@/components/social/GameChat";
import { RecentGamesList } from "@/components/game/RecentGamesList";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { GamePlayerBar } from "@/components/play/GamePlayerBar";
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
  const { t } = useTranslation();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameState>({ fen: "start", moves: [] });
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [aiEloChoice, setAiEloChoice] = useState<AiLevelElo>(1250);
  const [aiDefaultSet, setAiDefaultSet] = useState(false);
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
  const levelLabel = user?.chess_level ? chessLevelLabel(t, user.chess_level) : undefined;
  const modeLabelText = modeLabel(t, mode);
  const gameActive = gameId && gameData.status === "active";
  const gameCompleted = gameData.status === "completed";
  const isLiveHuman = Boolean(gameId && !isVsAi);
  const gameIsTimed = gameData.is_timed !== false;
  const clockLabel = formatTimeControlLabel(
    gameIsTimed,
    gameData.time_control_minutes ?? timeMinutes
  );
  const headerAiElo = isVsAi ? (gameData.ai_target_elo ?? aiElo ?? aiEloChoice) : aiEloChoice;
  const headerAi = pickAiAvatar(headerAiElo);
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
    if (!user) return;
    setAiDefaultSet(false);
    gamesApi
      .aiPreview(mode)
      .then(({ data }) => {
        setUserElo(data.user_elo);
        const suggested = normalizeToPreset(
          data.suggested_ai_elo ?? data.user_elo ?? defaultAiEloForUser(null, user.chess_level)
        );
        setAiEloChoice(suggested);
        setAiDefaultSet(true);
      })
      .catch((err) => {
        setAiEloChoice(defaultAiEloForUser(null, user.chess_level));
        setAiDefaultSet(true);
        setStatus(formatApiError(err, t("play.status.aiPreviewFailed")));
      });
  }, [user, mode, t]);

  useEffect(() => {
    if (!user || !aiDefaultSet) return;
    gamesApi
      .aiPreview(mode, aiEloChoice)
      .then(({ data }) => {
        setUserElo(data.user_elo);
        setAiElo(data.ai_target_elo);
      })
      .catch((err) => setStatus(formatApiError(err, t("play.status.aiPreviewFailed"))));
  }, [user, mode, aiEloChoice, aiDefaultSet, t]);

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
        setStatus(t("play.status.drawRepetition"));
      } else if (data.result) {
        setStatus(t("play.status.gameEnd", { result: data.result }));
      }
    }
  }, [t]);

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


  const { connected: wsConnected, wsError, sendMove: wsSendMove, resign: wsResign } = useGameWebSocket(
    gameId,
    isLiveHuman,
    handleWsUpdate,
    (payload) => {
      setStatus(
        t("play.status.gameEnd", {
          result: payload.game.result || t("play.status.gameEndGeneric"),
        })
      );
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
        setStatus(t("play.status.opponentFound"));
      });
    },
    [user?.id, applyGameResponse, t]
  );

  const { searching: wsSearching, mmError, search: wsSearch, cancel: wsCancel } =
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
        setStatus(t("play.status.gameLoaded"));
      })
      .catch(() => setStatus(t("play.status.gameNotFound")));
  }, [user, gameFromUrl, applyGameResponse, t]);

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
      setStatus(t("play.status.gameResumed"));
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
          ? t("play.status.gameStartedElo", { elo: data.ai_target_elo })
          : t("play.status.gameStarted")
      );
    } catch (err) {
      const msg = formatApiError(err);
      setStatus(
        msg.includes("joindre le serveur")
          ? msg
          : msg || t("play.status.startFailed")
      );
    }
  };

  const handleUndo = async () => {
    if (!gameId || !isVsAi) return;
    try {
      const { data } = await gamesApi.undo(gameId);
      applyGameResponse(data);
      setStatus(t("play.status.undoDone"));
    } catch {
      setStatus(t("play.status.undoFailed"));
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
          setStatus(
            t("play.status.gameEnd", {
              result: data.result || t("play.status.gameEndGeneric"),
            })
          );
        }
      } catch {
        gamesApi.get(gameId).then(({ data }) => applyGameResponse(data)).catch(() => {});
        setStatus(t("play.status.invalidMove"));
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
      playerIsWhite,
      gameData.white_time_ms,
      gameData.black_time_ms,
    ]
  );

  const findMatch = async () => {
    setSearching(true);
    setStatus(
      useClock
        ? t("play.status.searchTimed", { minutes: timeMinutes })
        : t("play.status.searchUnlimited")
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
        <p className="mb-4">{t("play.loginRequired")}</p>
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="font-display text-3xl font-bold capitalize">
          {t("play.title", { mode: modeLabelText })}
        </h1>
        <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
          <span className="relative w-9 h-9 rounded-lg overflow-hidden ring-2 ring-africhess-gold shrink-0">
            <Image
              src={headerAi.src}
              alt={headerAi.name}
              fill
              className="object-cover"
              sizes="36px"
            />
          </span>
          <span className="text-sm min-w-0">
            <span className="block text-[10px] uppercase tracking-wide opacity-50">{t("play.ai")}</span>
            <span className="font-medium truncate">{headerAi.name}</span>
          </span>
        </span>
      </div>

      {resumeOffer && !gameId && (
        <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {t("play.resume.saved", { mode: resumeOffer.mode, elo: resumeOffer.aiElo })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={resumeGame}
              className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
            >
              {t("play.resume.continue")}
            </button>
            <button
              onClick={() => {
                clearActiveGame();
                setResumeOffer(null);
              }}
              className="px-4 py-2 rounded-lg border text-sm opacity-70"
            >
              {t("play.resume.new")}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:grid-cols-[minmax(480px,1.55fr)_minmax(300px,380px)] gap-5 lg:gap-6 items-start">
        <div className="w-full min-w-0 space-y-3">
          {isLiveHuman && (
            <div className="space-y-1">
              <p className="text-xs text-center opacity-60">
                {wsConnected ? t("play.ws.connected") : t("play.ws.connecting")}
              </p>
              {wsError && (
                <InlineAlert variant="info" className="text-xs">
                  {wsError}
                </InlineAlert>
              )}
            </div>
          )}
          {isVsAi && gameId && user && (
            <GamePlayerBar
              user={user}
              aiElo={gameData.ai_target_elo ?? aiElo}
              playerIsWhite={playerIsWhite}
            />
          )}
          {movePending && isVsAi && (
            <p className="text-xs text-center text-africhess-gold animate-pulse">
              {t("play.ai.thinking")}
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
            <div className="flex flex-wrap gap-2 justify-center w-full">
              <button
                type="button"
                onClick={() =>
                  gameId &&
                  gamesApi
                    .offerDraw(gameId)
                    .then(() => setStatus(t("play.draw.sent")))
                    .catch((err) => setStatus(formatApiError(err, t("play.error.drawOffer"))))
                }
                className="text-xs px-3 py-1 rounded border border-white/20"
              >
                {t("play.draw.offer")}
              </button>
              <button
                type="button"
                onClick={() =>
                  gameId &&
                  gamesApi
                    .respondDraw(gameId, true)
                    .then(({ data }) => applyGameResponse(data))
                    .catch((err) => setStatus(formatApiError(err, t("play.error.drawAccept"))))
                }
                className="text-xs px-3 py-1 rounded border border-africhess-green text-africhess-green"
              >
                {t("play.draw.accept")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("play.resign.confirm"))) {
                    wsResign();
                    setStatus(t("play.resign.sent"));
                  }
                }}
                className="text-xs px-3 py-1 rounded border border-africhess-terracotta text-africhess-terracotta"
              >
                {t("play.resign")}
              </button>
            </div>
          )}
          {isLiveHuman && gameCompleted && gameId && (
            <button
              type="button"
              onClick={() =>
                gamesApi
                  .rematch(gameId)
                  .then(({ data }) => {
                    setGameId(data.id);
                    applyGameResponse(data);
                    setStatus(t("play.rematch.started"));
                  })
                  .catch((err) => setStatus(formatApiError(err, t("play.error.rematch"))))
              }
              className="w-full block py-2 text-sm rounded-lg african-gradient text-white"
            >
              {t("play.rematch")}
            </button>
          )}
          {isVsAi && gameActive && (
            <button
              type="button"
              onClick={handleUndo}
              className="w-full block py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5"
            >
              {t("play.undo.long")}
            </button>
          )}
        </div>

        <div className="w-full space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
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
              <h3 className="font-semibold text-sm mb-3">{t("play.comments")}</h3>
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

          <hr className="border-white/10 hidden lg:block" />
          <div className="glass-card p-4">
            <TimeControlPicker
              isTimed={useClock}
              minutes={timeMinutes}
              onTimedChange={setUseClock}
              onMinutesChange={setTimeMinutes}
            />
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">{t("play.vsAi.title")}</h2>
            {levelLabel && (
              <p className="text-xs opacity-60 mb-1">{t("play.vsAi.profile", { level: levelLabel })}</p>
            )}
            <p className="text-[10px] opacity-45 mb-2 leading-snug">
              {t("play.vsAi.hint", { mode: modeLabelText })}
            </p>
            <div className="flex justify-between text-xs mb-2 gap-2">
              <span className="opacity-70">
                {t("play.vsAi.yourElo", { mode: modeLabelText })} :{" "}
                <strong className="text-africhess-green">{userElo ?? "—"}</strong>
              </span>
              <span className="opacity-70">
                {t("play.vsAi.aiStrength")} :{" "}
                <strong className="text-africhess-gold">{aiElo ?? "—"}</strong>
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
              <option value="white">{t("play.color.white")}</option>
              <option value="black">{t("play.color.black")}</option>
            </select>
            <div className="mb-3 py-2 border-t border-white/10">
              <CommentsToggle />
            </div>
            <button
              onClick={startAI}
              className="w-full py-2 rounded-lg african-gradient text-white font-medium"
            >
              {t("play.vsAi.start")}
            </button>
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">{t("play.online.title")}</h2>
            {mmError && <InlineAlert className="mb-3 text-xs">{mmError}</InlineAlert>}
            <button
              onClick={findMatch}
              disabled={searching || wsSearching}
              className="w-full py-2 rounded-lg border-2 border-africhess-green text-africhess-green font-medium hover:bg-africhess-green/10 disabled:opacity-50"
            >
              {searching || wsSearching ? t("play.online.searching") : t("play.online.find")}
            </button>
            {(searching || wsSearching) && (
              <button
                type="button"
                onClick={() => {
                  wsCancel();
                  gamesApi.leaveQueue().catch(() => {});
                  setSearching(false);
                  setStatus(t("play.status.searchCancelled"));
                }}
                className="w-full mt-2 py-1 text-xs opacity-60 hover:opacity-100"
              >
                {t("play.online.cancel")}
              </button>
            )}
          </div>

          <div className="glass-card p-4">
            <BoardThemePicker compact />
          </div>

          {!gameId && <RecentGamesList limit={8} showTitle />}

          {status && (
            <p className="text-sm text-africhess-gold">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayFallback() {
  const { t } = useTranslation();
  return <div className="p-8 text-center">{t("common.loading")}</div>;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<PlayFallback />}>
      <PlayContent />
    </Suspense>
  );
}
