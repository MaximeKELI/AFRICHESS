"use client";

import { useState, useCallback, Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { BackgroundPicker } from "@/components/chess/BackgroundPicker";
import { OptionSection } from "@/components/ui/OptionSection";
import { OptionCategoryNav } from "@/components/ui/OptionCategoryNav";
import { AiCommentaryPanel } from "@/components/chess/AiCommentaryPanel";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { GameReview } from "@/components/chess/GameReview";
import { PlayBoardSection } from "@/components/play/PlayBoardSection";
import { gamesApi, ratingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { unlockAiSpeech, speakComment, bindAiSpeechToUserGestures } from "@/lib/aiSpeech";
import { defaultAiEloForUser, normalizeToPreset, resolveAiPlayMode, type AiLevelElo } from "@/lib/aiStrength";
import { AiStrengthPicker } from "@/components/chess/AiStrengthPicker";
import { VariantPicker, type GameVariant } from "@/components/chess/VariantPicker";
import { PocketBar } from "@/components/chess/PocketBar";
import { parsePocketsFromFen, pocketForPlayer } from "@/lib/crazyhouse";
import {
  buildGameDisplayFromFen,
  buildGameDisplayFromMoves,
  commentsFromMoves,
  type ApiMove,
} from "@/lib/chessDisplay";
import { usePreferencesStore } from "@/store/preferences";
import { formatTimeControlLabel, defaultPresetForMode, playModeFromPreset, TIME_PRESETS, type TimePresetId } from "@/lib/timeControl";
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
import {
  formatElo,
  isProvisionalRating,
  ratingForMode,
  type RatingRow,
} from "@/lib/ratings";
import { PgnExportButton } from "@/components/chess/PgnExportButton";
import { RecentGamesList } from "@/components/game/RecentGamesList";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { GameChat } from "@/components/social/GameChat";
import {
  opponentAndSelfPlayers,
  type GameBotPublic,
  type GamePlayerPublic,
} from "@/lib/gamePlayers";
import { parseAnalysisPayload, type GameAnalysisData } from "@/lib/gameAnalysis";

import {
  useGameWebSocket,
  useMatchmakingWebSocket,
  type WsGamePayload,
} from "@/hooks/useGameWebSocket";

interface GameState {
  fen: string;
  moves?: ApiMove[];
  pgn?: string;
  result?: string;
  white_player?: GamePlayerPublic | null;
  black_player?: GamePlayerPublic | null;
  white_elo?: number | null;
  black_elo?: number | null;
  white_elo_provisional?: boolean;
  black_elo_provisional?: boolean;
  bot?: GameBotPublic | null;
  white_time_ms?: number;
  black_time_ms?: number;
  increment_ms?: number;
  status?: string;
  termination_reason?: string;
  is_timed?: boolean;
  time_control_minutes?: number | null;
  is_vs_ai?: boolean;
  ai_target_elo?: number;
  variant?: GameVariant;
  analysis?: GameAnalysisData | null;
}

function PlayContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "blitz";
  const gameFromUrl = params.get("game");
  const botFromUrl = params.get("bot");
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameState>({ fen: "start", moves: [] });
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [aiEloChoice, setAiEloChoice] = useState<AiLevelElo>(1250);
  const [selectedBot, setSelectedBot] = useState<string | null>(botFromUrl);
  const [variant, setVariant] = useState<GameVariant>("standard");
  const [aiDefaultSet, setAiDefaultSet] = useState(false);
  const [useClock, setUseClock] = useState(true);
  const [isRated, setIsRated] = useState(true);
  const [timePreset, setTimePreset] = useState<TimePresetId>(() => defaultPresetForMode(mode));
  const [userElo, setUserElo] = useState<number | null>(null);
  const [modeRating, setModeRating] = useState<RatingRow | null>(null);
  const [aiElo, setAiElo] = useState<number | null>(null);
  const [isVsAi, setIsVsAi] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<ReturnType<typeof loadActiveGame>>(null);
  const [movePending, setMovePending] = useState(false);
  const [dropPiece, setDropPiece] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<GameVariant>("standard");
  const [mobileTab, setMobileTab] = useState<"board" | "moves" | "setup">("setup");
  const [setupCategory, setSetupCategory] = useState<
    "game" | "ai" | "online" | "board" | "pieces" | "background"
  >("game");
  const [aiStarting, setAiStarting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const botAutoStartRef = useRef(false);
  const { aiCommentsEnabled } = usePreferencesStore();
  const turnStartRef = useRef(Date.now());

  useEffect(() => {
    if (gameId) setMobileTab("board");
  }, [gameId]);

  useEffect(() => {
    if (!isVsAi || !gameId) return;
    return bindAiSpeechToUserGestures(true);
  }, [isVsAi, gameId]);

  const playerColor = orientation === "white" ? "w" : "b";
  const playerIsWhite = orientation === "white";
  const levelLabel = user?.chess_level ? chessLevelLabel(t, user.chess_level) : undefined;
  const modeLabelText = modeLabel(t, mode);
  const gameActive = gameId && gameData.status === "active";
  const gameCompleted = gameData.status === "completed";

  useEffect(() => {
    if (gameCompleted && gameId) {
      setReviewOpen(true);
      setMobileTab("board");
    }
  }, [gameCompleted, gameId]);

  const isLiveHuman = Boolean(gameId && !isVsAi);
  const gameIsTimed = gameData.is_timed !== false;
  const clockLabel = formatTimeControlLabel(
    gameIsTimed,
    gameData.time_control_minutes ?? timeMinutes
  );
  const headerAiElo = isVsAi ? (gameData.ai_target_elo ?? aiElo ?? aiEloChoice) : aiEloChoice;
  const headerAi = pickAiAvatar(headerAiElo);
  const timeOpts = useMemo(
    () => ({ isTimed: useClock, timeMinutes, isRated }),
    [useClock, timeMinutes, isRated]
  );
  const ratedClockLabel = MODE_CLOCK_LABEL[mode] ?? "10+0";

  const setupCategories = useMemo(
    () => [
      { id: "game", label: t("play.options.game") },
      { id: "ai", label: t("play.vsAi.title") },
      { id: "online", label: t("play.online.title") },
      { id: "board", label: t("board.picker.title") },
      { id: "pieces", label: t("board.picker.pieces") },
      { id: "background", label: t("background.picker.title") },
    ],
    [t]
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

  const gamePlayersSource = useMemo(() => {
    const patchSelf = (p: GamePlayerPublic | null | undefined) => {
      if (!p || !user || p.id !== user.id) return p ?? undefined;
      return {
        ...p,
        country: p.country || user.country,
        flair: p.flair ?? user.flair,
        avatar: p.avatar ?? user.avatar,
        display_name: p.display_name ?? user.display_name,
      };
    };
    return {
      ...gameData,
      white_player: patchSelf(gameData.white_player),
      black_player: patchSelf(gameData.black_player),
    };
  }, [gameData, user]);

  const boardPlayers = useMemo(() => {
    if (!gameId) return null;
    return opponentAndSelfPlayers(
      gamePlayersSource,
      orientation,
      user?.id,
      userElo
    );
  }, [gameId, gamePlayersSource, orientation, user?.id, userElo]);

  const moveComments = useMemo(() => {
    if (!gameData.moves?.length) return [];
    return commentsFromMoves(gameData.moves, playerIsWhite);
  }, [gameData.moves, playerIsWhite]);

  const userEloProvisional = isProvisionalRating(modeRating ?? undefined);

  useEffect(() => {
    if (!user) {
      setModeRating(null);
      return;
    }
    ratingsApi
      .me()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        setModeRating(ratingForMode(list, mode) ?? null);
      })
      .catch(() => setModeRating(null));
  }, [user, mode]);

  const aiPlayMode = useMemo(() => resolveAiPlayMode(mode), [mode]);

  useEffect(() => {
    if (!user) return;
    setAiDefaultSet(false);
    gamesApi
      .aiPreview(aiPlayMode)
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
  }, [user, aiPlayMode, t]);

  useEffect(() => {
    if (!user || !aiDefaultSet) return;
    gamesApi
      .aiPreview(aiPlayMode, aiEloChoice)
      .then(({ data }) => {
        setUserElo(data.user_elo);
        setAiElo(data.ai_target_elo);
      })
      .catch((err) => setStatus(formatApiError(err, t("play.status.aiPreviewFailed"))));
  }, [user, aiPlayMode, aiEloChoice, aiDefaultSet, t]);

  useEffect(() => {
    const saved = loadActiveGame();
    if (saved && !gameId) setResumeOffer(saved);
  }, [user, gameId]);

  useEffect(() => {
    turnStartRef.current = Date.now();
  }, [turn, gameData.white_time_ms, gameData.black_time_ms]);

  const applyGameResponse = useCallback((data: Partial<GameState> & { id?: string; fen?: string }) => {
    if (data.termination_reason === "repetition") {
      playDrawWhistle();
    }
    setGameData((prev) => ({
      ...prev,
      fen: data.fen ?? prev.fen,
      moves: data.moves ?? prev.moves ?? [],
      white_time_ms: data.white_time_ms ?? prev.white_time_ms,
      black_time_ms: data.black_time_ms ?? prev.black_time_ms,
      increment_ms: data.increment_ms ?? prev.increment_ms,
      status: data.status ?? prev.status,
      result: data.result ?? prev.result,
      termination_reason: data.termination_reason ?? prev.termination_reason,
      is_timed: data.is_timed ?? prev.is_timed,
      time_control_minutes: data.time_control_minutes ?? prev.time_control_minutes,
      is_vs_ai: data.is_vs_ai ?? prev.is_vs_ai,
      ai_target_elo: data.ai_target_elo ?? prev.ai_target_elo,
      white_player: data.white_player !== undefined ? data.white_player : prev.white_player,
      black_player: data.black_player !== undefined ? data.black_player : prev.black_player,
      white_elo: data.white_elo !== undefined ? data.white_elo : prev.white_elo,
      black_elo: data.black_elo !== undefined ? data.black_elo : prev.black_elo,
      white_elo_provisional:
        data.white_elo_provisional !== undefined
          ? data.white_elo_provisional
          : prev.white_elo_provisional,
      black_elo_provisional:
        data.black_elo_provisional !== undefined
          ? data.black_elo_provisional
          : prev.black_elo_provisional,
      bot: data.bot !== undefined ? data.bot : prev.bot,
      variant: (data.variant as GameVariant) ?? prev.variant ?? "standard",
      analysis:
        data.analysis !== undefined
          ? parseAnalysisPayload(data.analysis) ?? prev.analysis ?? null
          : prev.analysis,
    }));
    if (data.variant) setActiveVariant(data.variant as GameVariant);
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

  useEffect(() => {
    if (botFromUrl) setSelectedBot(botFromUrl);
  }, [botFromUrl]);

  const startAI = useCallback(async () => {
    if (aiStarting || gameId) return;
    unlockAiSpeech();
    if (aiCommentsEnabled) {
      speakComment(t("comments.voice.gameStart"), { byAi: true, enabled: true, forceUnlock: true });
    }
    setAiStarting(true);
    setSetupCategory("ai");
    setMobileTab("board");
    try {
      const { data } = await gamesApi.createAI({
        mode: aiPlayMode,
        ...(selectedBot ? { bot_slug: selectedBot } : { ai_elo: aiEloChoice }),
        variant,
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
        mode: aiPlayMode,
        orientation,
        aiElo: aiEloChoice,
        savedAt: Date.now(),
      });
      setStatus(
        data.ai_target_elo
          ? t("play.status.gameStartedElo", { elo: data.ai_target_elo })
          : t("play.status.gameStarted")
      );
      if (aiCommentsEnabled && data.moves?.length) {
        const allComments = commentsFromMoves(data.moves, orientation === "white");
        const lastComment = allComments.at(-1);
        if (lastComment) {
          speakComment(lastComment.text, {
            byAi: lastComment.byAi,
            enabled: true,
            forceUnlock: true,
          });
        }
      }
    } catch (err) {
      const msg = formatApiError(err);
      setStatus(
        msg.includes("joindre le serveur")
          ? msg
          : msg || t("play.status.startFailed")
      );
    } finally {
      setAiStarting(false);
    }
  }, [
    aiStarting,
    gameId,
    aiPlayMode,
    selectedBot,
    aiEloChoice,
    variant,
    orientation,
    aiCommentsEnabled,
    useClock,
    timeMinutes,
    applyGameResponse,
    t,
  ]);

  useEffect(() => {
    if (!user || !botFromUrl || gameId || botAutoStartRef.current) return;
    botAutoStartRef.current = true;
    void startAI();
  }, [user, botFromUrl, gameId, startAI]);

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

  const crazyhousePockets = useMemo(
    () =>
      activeVariant === "crazyhouse"
        ? pocketForPlayer(parsePocketsFromFen(gameData.fen), playerColor as "w" | "b")
        : [],
    [activeVariant, gameData.fen, playerColor]
  );

  const handleMove = useCallback(
    async (uci: string) => {
      if (!gameId || gameCompleted) return;
      if (isVsAi) unlockAiSpeech();
      setDropPiece(null);
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
        if (isVsAi && aiCommentsEnabled && data.moves?.length) {
          const allComments = commentsFromMoves(data.moves, playerIsWhite);
          const lastComment = allComments.at(-1);
          if (lastComment) {
            speakComment(lastComment.text, {
              byAi: lastComment.byAi,
              enabled: true,
              forceUnlock: true,
            });
          }
        }
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
      playerIsWhite,
      t,
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
        is_rated: isRated,
        time_minutes: isRated && useClock ? null : useClock ? timeMinutes : null,
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-8">
      <div className="flex items-center gap-3 mb-4 md:mb-6 flex-wrap">
        <h1 className="font-display text-2xl md:text-3xl font-bold capitalize">
          {t("play.title", { mode: modeLabelText })}
        </h1>
        <span className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
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

      {user && userEloProvisional && !gameId && modeRating && (
        <div className="glass-card p-3 mb-4 text-sm text-africhess-gold/95 border border-africhess-gold/25">
          {t("play.provisional.banner", {
            elo: formatElo(modeRating.elo, true),
            mode: modeLabelText,
            remaining:
              modeRating.games_until_established ??
              Math.max(0, 5 - (modeRating.games_count ?? 0)),
          })}
        </div>
      )}

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

      {!gameId && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={startAI}
            disabled={aiStarting}
            className="flex-1 py-3 rounded-xl african-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {aiStarting ? t("common.loading") : t("play.vsAi.start")}
          </button>
          <button
            type="button"
            onClick={findMatch}
            disabled={searching || wsSearching || aiStarting}
            className="flex-1 py-3 rounded-xl border-2 border-africhess-green text-africhess-green text-sm font-semibold disabled:opacity-50"
          >
            {searching || wsSearching ? t("play.online.searching") : t("play.online.find")}
          </button>
        </div>
      )}

      <div className="play-mobile-tabs lg:hidden" role="tablist" aria-label={t("play.mobileTabs")}>
        {(["board", "moves", "setup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`play-mobile-tab ${mobileTab === tab ? "play-mobile-tab-active" : "opacity-70"}`}
          >
            {t(`play.mobileTab.${tab}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] gap-4 lg:gap-5 items-start">
        <div className={`w-full min-w-0 max-w-full space-y-3 ${mobileTab !== "board" ? "hidden lg:block" : ""}`}>
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
            serverValidated={activeVariant !== "standard"}
            pendingDrop={activeVariant === "crazyhouse" ? dropPiece : null}
            onDropAtSquare={(uci) => handleMove(uci)}
            topPlayer={
              boardPlayers
                ? {
                    player: boardPlayers.top,
                    side: orientation === "white" ? "black" : "white",
                  }
                : undefined
            }
            bottomPlayer={
              boardPlayers
                ? {
                    player: boardPlayers.bottom,
                    side: orientation === "white" ? "white" : "black",
                  }
                : undefined
            }
            captured={panelDisplay.captured}
          />
          {gameCompleted && gameId && !reviewOpen && (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="w-full py-3 rounded-xl african-gradient text-white text-sm font-semibold shadow-lg"
            >
              {t("chess.review.open")}
            </button>
          )}
          {gameCompleted && gameId && reviewOpen && (
            <GameReview
              gameId={gameId}
              playerIsWhite={playerIsWhite}
              orientation={orientation}
              initialAnalysis={gameData.analysis ?? null}
              result={gameData.result}
              onClose={() => setReviewOpen(false)}
            />
          )}
          {isVsAi && gameId && (
            <div className="glass-card p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-sm">{t("play.comments")}</h3>
                <CommentsToggle compact />
              </div>
              <AiCommentaryPanel
                comments={moveComments}
                enabled={aiCommentsEnabled}
                compact={mobileTab === "board"}
              />
            </div>
          )}
          {activeVariant === "crazyhouse" && gameId && isMyTurn && (
            <PocketBar
              pieces={crazyhousePockets}
              selected={dropPiece}
              onSelect={setDropPiece}
              disabled={!gameActive || movePending}
            />
          )}
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

        <div
          className={`w-full space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin ${
            mobileTab === "board" ? "hidden lg:block" : ""
          }`}
        >
          <div className={mobileTab === "moves" ? "block space-y-4" : "hidden lg:block lg:space-y-4"}>
            <GameSidePanel
              moves={panelDisplay.moveRows}
              isCheck={panelDisplay.isCheck}
              turn={panelDisplay.turn}
              openingName={openingName}
            />
            {isVsAi && !gameId && (
              <div className="glass-card p-4 hidden lg:block">
                <h3 className="font-semibold text-sm mb-3">{t("play.comments")}</h3>
                <CommentsToggle />
              </div>
            )}
            {gameCompleted && gameId && (
              <div className="flex justify-center hide-in-zen">
                <PgnExportButton
                  pgn={gameData.pgn}
                  moves={gameData.moves}
                  white={gameData.white_player?.username}
                  black={gameData.black_player?.username}
                  result={gameData.result}
                  gameId={gameId}
                />
              </div>
            )}
            {gameId && !isVsAi && <GameChat gameId={gameId} />}
          </div>

          <div className={mobileTab === "setup" ? "block space-y-4" : "hidden lg:block lg:space-y-4"}>
          <hr className="border-white/10 hidden lg:block" />

          <OptionCategoryNav
            categories={setupCategories}
            active={setupCategory}
            onChange={(id) =>
              setSetupCategory(
                id as "game" | "ai" | "online" | "board" | "pieces" | "background"
              )
            }
            ariaLabel={t("play.options.sectionNav")}
          />

          {setupCategory === "game" && (
            <>
              <OptionSection compact title={t("play.options.game")} description={t("play.rated.label")}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t("play.rated.label")}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRated}
                      onClick={() => setIsRated((r) => !r)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${isRated ? "african-gradient text-white" : "border border-white/20"}`}
                    >
                      {isRated ? t("play.rated.on") : t("play.rated.off")}
                    </button>
                  </div>
                  {isRated && useClock ? (
                    <p className="text-xs opacity-60">
                      {t("play.rated.clock", { clock: ratedClockLabel, mode: modeLabelText })}
                    </p>
                  ) : (
                    <TimeControlPicker
                      isTimed={useClock}
                      minutes={timeMinutes}
                      onTimedChange={setUseClock}
                      onMinutesChange={setTimeMinutes}
                    />
                  )}
                </div>
              </OptionSection>
              {!gameId && <RecentGamesList limit={8} showTitle />}
            </>
          )}

          {setupCategory === "ai" && (
            <OptionSection compact title={t("play.vsAi.title")} description={t("play.vsAi.hint", { mode: modeLabelText })}>
              {levelLabel && (
                <p className="text-xs opacity-60 mb-1">{t("play.vsAi.profile", { level: levelLabel })}</p>
              )}
              <div className="flex justify-between text-xs mb-3 gap-2 hide-in-zen">
                <span className="opacity-70">
                  {t("play.vsAi.yourElo", { mode: modeLabelText })} :{" "}
                  <strong className="text-africhess-green">
                    {formatElo(userElo, userEloProvisional)}
                  </strong>
                </span>
                <span className="opacity-70">
                  {t("play.vsAi.aiStrength")} :{" "}
                  <strong className="text-africhess-gold">{aiElo ?? "—"}</strong>
                </span>
              </div>
              <div className="mb-3 border-t border-white/10 pt-3">
                <VariantPicker value={variant} onChange={setVariant} />
              </div>
              {selectedBot ? (
                <div className="mb-3 p-2 rounded-lg border border-africhess-gold/30 text-sm">
                  <p>{t("play.botSelected", { slug: selectedBot })}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedBot(null)}
                    className="text-xs text-africhess-gold hover:underline mt-1"
                  >
                    {t("play.botClear")}
                  </button>
                </div>
              ) : (
                <div className="mb-3 border-t border-white/10 pt-3">
                  <AiStrengthPicker value={aiEloChoice} onChange={setAiEloChoice} />
                </div>
              )}
              <Link href="/bots" className="text-xs text-africhess-gold hover:underline block mb-3">
                {t("play.browseBots")}
              </Link>
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
                type="button"
                onClick={startAI}
                disabled={aiStarting}
                className="w-full py-2 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
              >
                {aiStarting ? t("common.loading") : t("play.vsAi.start")}
              </button>
            </OptionSection>
          )}

          {setupCategory === "online" && (
            <OptionSection compact title={t("play.online.title")}>
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
            </OptionSection>
          )}

          {setupCategory === "board" && (
            <OptionSection
              compact
              title={t("board.picker.title")}
              description={t("board.picker.hint")}
            >
              <BoardThemePicker compact showHeader={false} showPieces={false} />
            </OptionSection>
          )}

          {setupCategory === "pieces" && (
            <OptionSection
              compact
              title={t("board.picker.pieces")}
              description={t("board.picker.piecesHint")}
            >
              <BoardThemePicker compact showHeader={false} showColors={false} />
            </OptionSection>
          )}

          {setupCategory === "background" && (
            <OptionSection
              compact
              title={t("background.picker.title")}
              description={t("background.picker.hint")}
            >
              <BackgroundPicker compact showHeader={false} />
            </OptionSection>
          )}

          {status && (
            <p className="text-sm text-africhess-gold">{status}</p>
          )}
          </div>
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
