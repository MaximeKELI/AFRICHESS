"use client";

import { useState, useCallback, Suspense, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { PlaySetupOptions, type PlaySetupCategory } from "@/components/chess/PlaySetupOptions";
import { OptionSection } from "@/components/ui/OptionSection";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { PlayBoardSection } from "@/components/play/PlayBoardSection";
import { GameOverRatingBanner } from "@/components/play/GameOverRatingBanner";
import { GameEndOverlay } from "@/components/play/GameEndOverlay";
import { GamePendingActionsBanner } from "@/components/play/GamePendingActionsBanner";
import { movesMissingComments, pollPendingMoveComments } from "@/lib/pollGameComments";
import { useAuthStore } from "@/store/auth";
import { unlockAiSpeech, speakComment, bindAiSpeechToUserGestures } from "@/lib/aiSpeech";
import { defaultAiEloForUser, normalizeToPreset, resolveAiPlayMode, type AiLevelElo } from "@/lib/aiStrength";
import { AiStrengthPicker } from "@/components/chess/AiStrengthPicker";
import { VariantPicker, type GameVariant } from "@/components/chess/VariantPicker";
import { parsePocketsFromFen, pocketForPlayer } from "@/lib/crazyhouse";
import {
  buildGameDisplayFromFen,
  buildGameDisplayFromMoves,
  appendApiMovesToDisplay,
  commentsFromMoves,
  type ApiMove,
  type GameDisplayState,
} from "@/lib/chessDisplay";
import { mergeApiMoves } from "@/lib/gameMerge";
import { gamesApi, ratingsApi } from "@/lib/api";
import { usePreferencesStore } from "@/store/preferences";
import { formatTimeControlLabel, defaultPresetForMode, matchmakingTimeControl, playModeFromPreset, TIME_PRESETS, inferPresetFromMs, type TimePresetId } from "@/lib/timeControl";
import { turnFromFen } from "@/lib/gameDisplayFast";
import { TimeControlPicker } from "@/components/chess/TimeControlPicker";
import { playDrawWhistle, playGameVictory, playGameDefeat } from "@/lib/chessSounds";
import { computePlayerOutcome, type PlayerOutcome } from "@/lib/gameOutcome";
import { formatApiError } from "@/lib/errors";
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
} from "@/lib/gameStorage";
import { openingNameFromMoves } from "@/lib/openings";
import Link from "next/link";
import Image from "next/image";
import { getAiAvatarSrc, pickAiAvatar } from "@/lib/avatars";
import { useFairPlayTelemetry } from "@/hooks/useFairPlayTelemetry";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelLabel, modeLabel } from "@/lib/i18n/labels";
import {
  formatElo,
  isProvisionalRating,
  ratingForMode,
  type GameRatingChanges,
  type RatingRow,
} from "@/lib/ratings";
import { PgnExportButton } from "@/components/chess/PgnExportButton";
import { InlineAlert } from "@/components/ui/InlineAlert";
import {
  opponentAndSelfPlayers,
  type GameBotPublic,
  type GamePlayerPublic,
} from "@/lib/gamePlayers";
import { isAnalysisIncomplete, parseAnalysisPayload, type GameAnalysisData } from "@/lib/gameAnalysis";

import { useGameWebSocket, type WsGamePatch, type WsGamePayload } from "@/hooks/useGameWebSocket";
import { useMatchmakingWebSocket } from "@/hooks/useMatchmakingWebSocket";
import { useVisibilityInterval } from "@/hooks/useVisibilityInterval";

const AiTauntBubble = dynamic(
  () => import("@/components/chess/AiTauntBubble").then((m) => m.AiTauntBubble),
  { ssr: false }
);
const GameReview = dynamic(
  () => import("@/components/chess/GameReview").then((m) => m.GameReview),
  { ssr: false, loading: () => <div className="h-24 rounded-xl bg-white/5 animate-pulse" /> }
);
const AiCommentaryPanel = dynamic(
  () => import("@/components/chess/AiCommentaryPanel").then((m) => m.AiCommentaryPanel),
  { ssr: false }
);
const FairPlayConsentModal = dynamic(
  () => import("@/components/fairplay/FairPlayConsentModal").then((m) => m.FairPlayConsentModal),
  { ssr: false }
);
const RecentGamesList = dynamic(
  () => import("@/components/game/RecentGamesList").then((m) => m.RecentGamesList),
  { ssr: false, loading: () => <div className="h-32 rounded-xl bg-white/5 animate-pulse" /> }
);
const GameChat = dynamic(
  () => import("@/components/social/GameChat").then((m) => m.GameChat),
  { ssr: false }
);
const VoteChessPanel = dynamic(
  () => import("@/components/play/VoteChessPanel").then((m) => m.VoteChessPanel),
  { ssr: false }
);
const PocketBar = dynamic(
  () => import("@/components/chess/PocketBar").then((m) => m.PocketBar),
  { ssr: false }
);

type ChessCtor = typeof import("chess.js").Chess;

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
  is_vote_chess?: boolean;
  is_rated?: boolean;
  move_count?: number;
  takeback_requested_by?: number | null;
  draw_offered_by?: number | null;
  threefold_available?: boolean;
  fifty_available?: boolean;
  ai_target_elo?: number;
  variant?: GameVariant;
  analysis?: GameAnalysisData | null;
  comments_pending?: boolean;
  delta?: boolean;
  new_moves?: ApiMove[];
  game_over?: boolean;
  rating_changes?: GameRatingChanges | null;
}

function PlayContent() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode") || "blitz";
  const gameFromUrl = params.get("game");
  const botFromUrl = params.get("bot");
  const setupFromUrl = params.get("setup");
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameState>({ fen: "start", moves: [] });
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [searchingPool, setSearchingPool] = useState<number | null>(null);
  const [aiEloChoice, setAiEloChoice] = useState<AiLevelElo>(1250);
  const [selectedBot, setSelectedBot] = useState<string | null>(botFromUrl);
  const [selectedBotInfo, setSelectedBotInfo] = useState<GameBotPublic | null>(null);
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
  const [voteRefreshToken, setVoteRefreshToken] = useState(0);
  const [wsVoteTally, setWsVoteTally] = useState<import("@/hooks/useGameWebSocket").VoteTallyPayload | null>(null);
  const [dropPiece, setDropPiece] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<GameVariant>("standard");
  const [mobileTab, setMobileTab] = useState<"board" | "moves" | "chat" | "setup">("setup");
  const [setupCategory, setSetupCategory] = useState<PlaySetupCategory>("game");
  const [aiStarting, setAiStarting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [gameEndOverlay, setGameEndOverlay] = useState<{
    outcome: PlayerOutcome;
    terminationReason?: string | null;
    result?: string | null;
  } | null>(null);
  const gameEndShownRef = useRef<string | null>(null);
  const gameWasActiveRef = useRef(false);
  const { aiCommentsEnabled, blindMode, setBlindMode } = usePreferencesStore();
  const turnStartRef = useRef(Date.now());
  const activeGameId = gameId ?? gameFromUrl;

  useEffect(() => {
    if (activeGameId) setMobileTab("board");
  }, [activeGameId]);

  useEffect(() => {
    if (!isVsAi || !gameId) return;
    return bindAiSpeechToUserGestures(true);
  }, [isVsAi, gameId]);

  const playerColor = orientation === "white" ? "w" : "b";
  const playerIsWhite = orientation === "white";
  const levelLabel = user?.chess_level ? chessLevelLabel(t, user.chess_level) : undefined;
  /** Mode effectif = cadence choisie (bullet/blitz/rapid/classical), pas le ?mode= URL. */
  const searchMode = useClock ? playModeFromPreset(timePreset) : mode;
  const modeLabelText = modeLabel(t, searchMode);
  const gameReady =
    gameData.status === "active" || gameData.status === "completed";
  const gameActive = Boolean(activeGameId && gameData.status === "active");
  const gameCompleted = gameData.status === "completed";

  useEffect(() => {
    if (gameCompleted && gameId) {
      setMobileTab("board");
    }
  }, [gameCompleted, gameId]);

  useEffect(() => {
    if (!gameId) {
      gameEndShownRef.current = null;
      gameWasActiveRef.current = false;
      setGameEndOverlay(null);
      setReviewOpen(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameData.status === "active") {
      gameWasActiveRef.current = true;
    }
  }, [gameData.status]);

  const showGameEndOverlayIfNeeded = useCallback(
    (result: string | null | undefined, terminationReason?: string | null) => {
      if (!gameId || !result || !gameWasActiveRef.current) return;
      if (gameEndShownRef.current === gameId) return;
      const outcome = computePlayerOutcome(result, playerIsWhite);
      if (!outcome) return;
      gameEndShownRef.current = gameId;
      setGameEndOverlay({
        outcome,
        terminationReason: terminationReason ?? gameData.termination_reason,
        result,
      });
      if (outcome === "win") playGameVictory();
      else if (outcome === "loss") playGameDefeat();
      else playDrawWhistle();
    },
    [gameId, playerIsWhite, gameData.termination_reason]
  );

  // Parties vs IA : pas de WS actif pendant le jeu — poll léger jusqu'à l'analyse auto.
  useEffect(() => {
    if (!gameCompleted || !gameId) return;
    if (gameData.analysis && !isAnalysisIncomplete(gameData.analysis, gameData.move_count)) return;

    let cancelled = false;
    let delay = 700;

    const poll = async () => {
      while (!cancelled) {
        try {
          const { data } = await gamesApi.get(gameId);
          const parsed = parseAnalysisPayload(data.analysis);
          if (parsed && !isAnalysisIncomplete(parsed, data.move_count)) {
            setGameData((prev) => ({ ...prev, analysis: parsed }));
            return;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(Math.round(delay * 1.25), 2500);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [gameCompleted, gameId, gameData.analysis, gameData.move_count]);

  const [fairplayConsent, setFairplayConsent] = useState<boolean | null>(null);
  const [fairplayExempt, setFairplayExempt] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setFairplayConsent(null);
      setFairplayExempt(false);
      return;
    }
    gamesApi
      .fairplayStatus()
      .then(({ data }) => {
        setFairplayExempt(Boolean(data.exempt));
        setFairplayConsent(Boolean(data.consent_given));
      })
      .catch(() => {
        setFairplayConsent(false);
        setFairplayExempt(false);
      });
  }, [user?.id]);

  const isLiveHuman = Boolean(gameId && !isVsAi);
  const isVoteChess = Boolean(gameData.is_vote_chess);
  const telemetryEnabled = isLiveHuman && fairplayConsent === true && !fairplayExempt;

  useEffect(() => {
    if (!gameCompleted || !gameId || !gameData.result) return;
    showGameEndOverlayIfNeeded(gameData.result, gameData.termination_reason);
  }, [
    gameCompleted,
    gameId,
    gameData.result,
    gameData.termination_reason,
    showGameEndOverlayIfNeeded,
  ]);

  const handleGameEndContinue = useCallback(() => {
    setGameEndOverlay(null);
    if (gameId) setReviewOpen(true);
  }, [gameId]);
  const { consumePatch: consumeFairPlayPatch, notePremove } = useFairPlayTelemetry(telemetryEnabled);
  const gameIsTimed = gameData.is_timed !== false;
  useEffect(() => {
    setTimePreset(defaultPresetForMode(mode));
  }, [mode]);

  const activePreset =
    (gameId ? inferPresetFromMs(gameData.white_time_ms, gameData.increment_ms) : null) ??
    timePreset;
  const clockLabel = formatTimeControlLabel(gameIsTimed, gameIsTimed ? activePreset : null);
  const fallbackBaseMs = TIME_PRESETS[activePreset].baseMs;
  const headerAiElo = isVsAi ? (gameData.ai_target_elo ?? aiElo ?? aiEloChoice) : aiEloChoice;
  const headerAi = useMemo(() => {
    const bot = gameData.bot ?? selectedBotInfo;
    const fallback = pickAiAvatar(headerAiElo);
    if (bot) {
      const slug = "slug" in bot ? bot.slug : selectedBot;
      return {
        src: getAiAvatarSrc(bot.avatar_id ?? slug),
        name: bot.name,
      };
    }
    if (selectedBot) {
      return {
        src: getAiAvatarSrc(selectedBotInfo?.avatar_id ?? selectedBot),
        name: selectedBotInfo?.name ?? selectedBot,
      };
    }
    return fallback;
  }, [gameData.bot, selectedBotInfo, selectedBot, headerAiElo]);
  const headerAiDisplay = headerAi;
  const rejoinMatchmakingRef = useRef<() => void>(() => {});
  const timeOpts = useMemo(
    () => ({
      isTimed: useClock,
      timePreset,
      isRated,
      variant,
      onListenOnlyOpen: () => rejoinMatchmakingRef.current(),
    }),
    [useClock, timePreset, isRated, variant]
  );

  useEffect(() => {
    if (!setupFromUrl) return;
    if (setupFromUrl === "background" || setupFromUrl === "board" || setupFromUrl === "pieces") {
      setSetupCategory("style");
      setMobileTab("setup");
    } else if (setupFromUrl === "ai") {
      setSetupCategory("ai");
      setMobileTab("setup");
    } else if (setupFromUrl === "game" || setupFromUrl === "online") {
      setSetupCategory(setupFromUrl);
      setMobileTab("setup");
    }
  }, [setupFromUrl]);

  const displayCacheRef = useRef<GameDisplayState>(buildGameDisplayFromFen("start"));
  const movesLenRef = useRef(0);

  const panelDisplay = useMemo(() => {
    const moves = gameData.moves ?? [];
    if (!moves.length) {
      displayCacheRef.current = buildGameDisplayFromFen(gameData.fen);
      movesLenRef.current = 0;
      return displayCacheRef.current;
    }

    const prevLen = movesLenRef.current;
    if (moves.length > prevLen && moves.length - prevLen <= 2) {
      displayCacheRef.current = appendApiMovesToDisplay(
        displayCacheRef.current,
        moves.slice(prevLen)
      );
    } else if (moves.length !== prevLen) {
      displayCacheRef.current = buildGameDisplayFromMoves("start", moves);
    }
    movesLenRef.current = moves.length;
    return displayCacheRef.current;
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
    if (!activeGameId) return null;
    return opponentAndSelfPlayers(
      gamePlayersSource,
      orientation,
      user?.id,
      userElo
    );
  }, [activeGameId, gamePlayersSource, orientation, user?.id, userElo]);

  const opponentName = useMemo(() => {
    if (!boardPlayers || isVsAi) return undefined;
    return boardPlayers.top.name;
  }, [boardPlayers, isVsAi]);

  const mobileTabs = useMemo(() => {
    const tabs: Array<"board" | "moves" | "chat" | "setup"> = ["board", "moves"];
    if (isLiveHuman && gameId) tabs.push("chat");
    tabs.push("setup");
    return tabs;
  }, [isLiveHuman, gameId]);

  const topPlayerConfig = useMemo(
    () =>
      boardPlayers
        ? {
            player: boardPlayers.top,
            side: (orientation === "white" ? "black" : "white") as "white" | "black",
          }
        : undefined,
    [boardPlayers, orientation]
  );

  const bottomPlayerConfig = useMemo(
    () =>
      boardPlayers
        ? {
            player: boardPlayers.bottom,
            side: (orientation === "white" ? "white" : "black") as "white" | "black",
          }
        : undefined,
    [boardPlayers, orientation]
  );

  const moveComments = useMemo(() => {
    if (!gameData.moves?.length) return [];
    return commentsFromMoves(gameData.moves, playerIsWhite, isVsAi);
  }, [gameData.moves, playerIsWhite, isVsAi]);

  const latestAiComment = useMemo(
    () => moveComments.filter((comment) => comment.byAi).at(-1),
    [moveComments]
  );

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

  useEffect(() => {
    if (!gameCompleted || !user || !gameData.is_rated || !gameData.rating_changes) return;
    ratingsApi
      .me()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        setModeRating(ratingForMode(list, mode) ?? null);
      })
      .catch(() => {});
  }, [gameCompleted, user, gameData.is_rated, gameData.rating_changes, mode]);

  const aiPlayMode = useMemo(
    () => (useClock ? playModeFromPreset(timePreset) : resolveAiPlayMode(mode)),
    [useClock, timePreset, mode]
  );

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
    if (saved && !gameId && !gameFromUrl) setResumeOffer(saved);
  }, [user, gameId, gameFromUrl]);

  // Reprendre une partie humaine active (refresh / onglet fermé)
  useEffect(() => {
    if (!user || gameId || gameFromUrl) return;
    gamesApi
      .active()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        const live = list.find((g: { is_vs_ai?: boolean; status?: string }) => !g.is_vs_ai && g.status === "active");
        if (!live?.id) return;
        setResumeOffer({
          gameId: live.id,
          mode: live.mode || "blitz",
          orientation: "white",
          aiElo: 1250,
          savedAt: Date.now(),
        });
      })
      .catch(() => {});
  }, [user, gameId, gameFromUrl]);

  useEffect(() => {
    turnStartRef.current = Date.now();
  }, [turn, gameData.white_time_ms, gameData.black_time_ms]);

  const applyGameResponse = useCallback((data: Partial<GameState> & { id?: string; fen?: string }) => {
    if (data.termination_reason === "repetition") {
      playDrawWhistle();
    }
    setGameData((prev) => {
      let mergedMoves = prev.moves ?? [];
      if (data.delta && data.new_moves?.length) {
        mergedMoves = mergeApiMoves(mergedMoves, data.new_moves);
      } else if (data.moves !== undefined) {
        mergedMoves = data.moves;
      }

      return {
        ...prev,
        fen: data.fen ?? prev.fen,
        moves: mergedMoves,
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
        is_rated: data.is_rated !== undefined ? data.is_rated : prev.is_rated,
        rating_changes:
          data.rating_changes !== undefined ? data.rating_changes : prev.rating_changes,
        bot: data.bot !== undefined ? data.bot : prev.bot,
        variant: (data.variant as GameVariant) ?? prev.variant ?? "standard",
        draw_offered_by:
          data.draw_offered_by !== undefined ? data.draw_offered_by : prev.draw_offered_by,
        threefold_available:
          data.status === "completed"
            ? false
            : data.threefold_available === true
              ? true
              : data.fen !== undefined || data.delta || data.new_moves !== undefined
                ? false
                : prev.threefold_available,
        fifty_available:
          data.status === "completed"
            ? false
            : data.fifty_available === true
              ? true
              : data.fen !== undefined || data.delta || data.new_moves !== undefined
                ? false
                : prev.fifty_available,
        takeback_requested_by:
          data.takeback_requested_by !== undefined
            ? data.takeback_requested_by
            : prev.takeback_requested_by,
        analysis:
          data.analysis !== undefined
            ? parseAnalysisPayload(data.analysis) ?? prev.analysis ?? null
            : prev.analysis,
      };
    });
    if (data.variant) setActiveVariant(data.variant as GameVariant);
    if (data.ai_target_elo) setAiElo(data.ai_target_elo);
    if (data.is_vs_ai !== undefined) setIsVsAi(data.is_vs_ai);
    if (data.status === "completed") {
      clearActiveGame();
      if (data.result) {
        showGameEndOverlayIfNeeded(data.result, data.termination_reason);
      }
      if (data.termination_reason === "repetition") {
        setStatus(t("play.status.drawRepetition"));
      } else if (data.result) {
        setStatus(t("play.status.gameEnd", { result: data.result }));
      }
    }
  }, [t, showGameEndOverlayIfNeeded]);

  const refreshPendingComments = useCallback(
    (data: Partial<GameState> & { comments_pending?: boolean }, id: string | null) => {
      if (!id || !aiCommentsEnabled || !data.is_vs_ai) return;
      const missing = movesMissingComments(data.moves as ApiMove[] | undefined);
      if (!data.comments_pending && missing === 0) return;
      void pollPendingMoveComments(id, (fresh) => {
        applyGameResponse(fresh as Partial<GameState> & { id?: string; fen?: string });
      });
    },
    [aiCommentsEnabled, applyGameResponse]
  );

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
          delta: g.delta,
          new_moves: g.new_moves,
          moves: g.delta ? undefined : ((g.moves ?? []) as ApiMove[]),
          white_time_ms: g.white_time_ms,
          black_time_ms: g.black_time_ms,
          increment_ms: g.increment_ms,
          status: g.status,
          result: g.result,
          is_vs_ai: g.is_vs_ai,
          is_rated: g.is_rated,
          termination_reason: g.termination_reason,
          white_elo: g.white_elo,
          black_elo: g.black_elo,
          white_elo_provisional: g.white_elo_provisional,
          black_elo_provisional: g.black_elo_provisional,
          rating_changes: g.rating_changes,
          draw_offered_by: g.draw_offered_by,
          takeback_requested_by: g.takeback_requested_by,
          threefold_available:
            (p as WsGamePayload & { threefold_available?: boolean }).threefold_available ??
            (g as { threefold_available?: boolean }).threefold_available,
          fifty_available:
            (p as WsGamePayload & { fifty_available?: boolean }).fifty_available ??
            (g as { fifty_available?: boolean }).fifty_available,
        });
      });
    },
    [applyGameResponse]
  );

  const handleWsGamePatch = useCallback((patch: WsGamePatch) => {
    setGameData((prev) => ({ ...prev, ...patch }));
  }, []);

  const acceptDrawOffer = useCallback(() => {
    if (!gameId) return;
    gamesApi
      .respondDraw(gameId, true)
      .then(({ data }) => applyGameResponse(data))
      .catch((err) => setStatus(formatApiError(err, t("play.error.drawAccept"))));
  }, [gameId, applyGameResponse, t]);

  const declineDrawOffer = useCallback(() => {
    if (!gameId) return;
    gamesApi
      .respondDraw(gameId, false)
      .then(() => {
        setGameData((prev) => ({ ...prev, draw_offered_by: null }));
        setStatus(t("play.draw.declined"));
      })
      .catch((err) => setStatus(formatApiError(err, t("play.error.drawOffer"))));
  }, [gameId, t]);

  const acceptTakebackRequest = useCallback(() => {
    if (!gameId) return;
    gamesApi
      .respondTakeback(gameId, true)
      .then(({ data }) => applyGameResponse(data))
      .catch((err) => setStatus(formatApiError(err, t("play.error.takeback"))));
  }, [gameId, applyGameResponse, t]);

  const flagClaimInFlight = useRef(false);
  const handleClockFlag = useCallback(
    (_side: "w" | "b") => {
      if (!gameId || gameCompleted || flagClaimInFlight.current) return;
      if (!gameIsTimed) return;
      flagClaimInFlight.current = true;
      gamesApi
        .claimFlag(gameId)
        .then(({ data }) => {
          applyGameResponse(data);
          if (data.result) {
            setStatus(t("play.status.gameEnd", { result: data.result }));
          }
        })
        .catch(() => {
          gamesApi
            .get(gameId)
            .then(({ data }) => applyGameResponse(data))
            .catch(() => {});
        })
        .finally(() => {
          flagClaimInFlight.current = false;
        });
    },
    [gameId, gameCompleted, gameIsTimed, applyGameResponse, t]
  );

  const claimThreefoldDraw = useCallback(() => {
    if (!gameId) return;
    gamesApi
      .claimDraw(gameId)
      .then(({ data }) => {
        applyGameResponse(data);
        setStatus(t("play.status.drawRepetition"));
      })
      .catch((err) => setStatus(formatApiError(err, t("play.error.drawClaim"))));
  }, [gameId, applyGameResponse, t]);

  const declineTakebackRequest = useCallback(() => {
    if (!gameId) return;
    gamesApi
      .respondTakeback(gameId, false)
      .then(() => {
        setGameData((prev) => ({ ...prev, takeback_requested_by: null }));
        setStatus(t("play.takeback.declined"));
      })
      .catch((err) => setStatus(formatApiError(err, t("play.error.takeback"))));
  }, [gameId, t]);

  const handleAnalysisReady = useCallback((payload: { analysis?: unknown }) => {
    const parsed = parseAnalysisPayload(payload.analysis);
    if (parsed) {
      setGameData((prev) => ({ ...prev, analysis: parsed }));
    }
  }, []);

  const syncGameInUrl = useCallback(
    (id: string, playMode?: string) => {
      const q = new URLSearchParams();
      q.set("game", id);
      q.set("mode", playMode || mode);
      router.replace(`/play?${q.toString()}`);
    },
    [router, mode]
  );

  const handleRematchReady = useCallback(
    (payload: { game_id: string; mode?: string }) => {
      if (!payload.game_id) return;
      setGameId(payload.game_id);
      setIsVsAi(false);
      syncGameInUrl(payload.game_id, payload.mode);
      gamesApi.get(payload.game_id).then(({ data }) => {
        if (data.white_player?.id === user?.id) setOrientation("white");
        else if (data.black_player?.id === user?.id) setOrientation("black");
        applyGameResponse(data);
        setStatus(t("play.rematch.started"));
      });
    },
    [user?.id, applyGameResponse, t, syncGameInUrl]
  );

  const { connected: wsConnected, wsError, sendMove: wsSendMove, resign: wsResign, sendChat: wsSendChat, subscribeChat: wsSubscribeChat } = useGameWebSocket(
    gameId,
    Boolean(gameId) && (isLiveHuman || isVoteChess || isVsAi),
    handleWsUpdate,
    (payload) => {
      applyGameResponse({
        fen: payload.game.fen,
        status: payload.game.status,
        result: payload.game.result,
        termination_reason: payload.game.termination_reason ?? payload.reason,
        white_time_ms: payload.game.white_time_ms,
        black_time_ms: payload.game.black_time_ms,
        rating_changes: payload.game.rating_changes,
      });
      setStatus(
        t("play.status.gameEnd", {
          result: payload.game.result || t("play.status.gameEndGeneric"),
        })
      );
    },
    handleWsGamePatch,
    handleAnalysisReady,
    (payload) => setWsVoteTally(payload),
    handleRematchReady
  );

  const handleMatchFound = useCallback(
    (id: string) => {
      setGameId(id);
      setIsVsAi(false);
      setSearching(false);
      gamesApi.get(id).then(({ data }) => {
        syncGameInUrl(id, data.mode);
        if (data.white_player?.id === user?.id) setOrientation("white");
        else if (data.black_player?.id === user?.id) setOrientation("black");
        applyGameResponse(data);
        setStatus(t("play.status.opponentFound"));
      });
    },
    [user?.id, applyGameResponse, t, syncGameInUrl]
  );

  rejoinMatchmakingRef.current = () => {
    const mmTimeControl = matchmakingTimeControl(useClock, timePreset);
    gamesApi
      .matchmaking(searchMode, {
        is_timed: useClock,
        is_rated: isRated,
        time_control: mmTimeControl,
        variant,
      })
      .then(({ data, status }) => {
        if (status === 201 && data?.id) {
          handleMatchFound(data.id);
        }
      })
      .catch(() => {});
  };

  const { searching: wsSearching, mmError, search: wsSearch, cancel: wsCancel } =
    useMatchmakingWebSocket(Boolean(user), searchMode, handleMatchFound, timeOpts);

  const chessCtorRef = useRef<ChessCtor | null>(null);

  const loadMatchmakingPool = useCallback(() => {
    gamesApi.matchmakingStatus().then(({ data }) => {
      setSearchingPool(data.searching_players ?? 0);
    }).catch(() => {});
  }, []);

  useVisibilityInterval(
    loadMatchmakingPool,
    30000,
    Boolean(user) && !gameId && !wsSearching
  );

  const isMyTurn =
    gameActive &&
    ((turn === "w" && playerIsWhite) || (turn === "b" && !playerIsWhite));

  const boardDisabled =
    !gameId ||
    gameCompleted ||
    movePending ||
    (!isVoteChess && !isMyTurn);

  const applyOptimisticUci = useCallback((uci: string) => {
    const apply = (ChessClass: ChessCtor) => {
      setGameData((prev) => {
        try {
          const chess = new ChessClass(prev.fen === "start" ? undefined : prev.fen);
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
    };
    if (chessCtorRef.current) {
      apply(chessCtorRef.current);
      return;
    }
    void import("chess.js").then(({ Chess }) => {
      chessCtorRef.current = Chess;
      apply(Chess);
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
        refreshPendingComments(data, data.id);
        setStatus(t("play.status.gameLoaded"));
      })
      .catch(() => setStatus(t("play.status.gameNotFound")));
  }, [user, gameFromUrl, applyGameResponse, refreshPendingComments, t]);

  const resumeGame = async () => {
    if (!resumeOffer) return;
    try {
      const { data } = await gamesApi.get(resumeOffer.gameId);
      setGameId(data.id);
      syncGameInUrl(data.id, data.mode || resumeOffer.mode);
      if (data.white_player?.id === user?.id) setOrientation("white");
      else if (data.black_player?.id === user?.id) setOrientation("black");
      else setOrientation(resumeOffer.orientation);
      if (resumeOffer.aiElo) setAiEloChoice(resumeOffer.aiElo as AiLevelElo);
      setIsVsAi(Boolean(data.is_vs_ai));
      applyGameResponse(data);
      refreshPendingComments(data, data.id);
      setResumeOffer(null);
      setStatus(t("play.status.gameResumed"));
    } catch {
      clearActiveGame();
      setResumeOffer(null);
      setStatus(t("play.status.gameNotFound"));
    }
  };

  useEffect(() => {
    if (botFromUrl) setSelectedBot(botFromUrl);
  }, [botFromUrl]);

  useEffect(() => {
    if (!selectedBot) return;
    setSetupCategory("ai");
    gamesApi
      .bot(selectedBot)
      .then(({ data }) => setSelectedBotInfo(data))
      .catch(() => setSelectedBotInfo(null));
  }, [selectedBot]);

  useEffect(() => {
    if (botFromUrl && !gameId) {
      setSetupCategory("ai");
      setMobileTab("setup");
    }
  }, [botFromUrl, gameId]);

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
        time_control: useClock ? timePreset : undefined,
      });
      setIsVsAi(true);
      setGameId(data.id);
      syncGameInUrl(data.id, aiPlayMode);
      applyGameResponse(data);
      refreshPendingComments(data, data.id);
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
    } catch (err) {
      const ax = err as { response?: { status?: number; data?: { code?: string } } };
      if (ax.response?.status === 403) {
        setStatus(
          ax.response.data?.code === "bot_locked"
            ? t("bots.lockedProgress")
            : t("premium.botLocked")
        );
      } else {
        setStatus(formatApiError(err, t("play.status.startFailed")));
      }
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
    timePreset,
    applyGameResponse,
    refreshPendingComments,
    syncGameInUrl,
    t,
  ]);

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
      if (isVoteChess) {
        if (movePending) return;
        setMovePending(true);
        try {
          await gamesApi.castVote(gameId, uci);
          setVoteRefreshToken((n) => n + 1);
          setStatus(t("vote.recorded"));
        } catch {
          setStatus(t("vote.applyFailed"));
        } finally {
          setMovePending(false);
        }
        return;
      }
      if (!isMyTurn) return;
      if (isVsAi && movePending) return;
      if (isVsAi) {
        unlockAiSpeech();
      }
      setDropPiece(null);
      const poolMs = playerIsWhite ? gameData.white_time_ms : gameData.black_time_ms;
      const spentMs = gameIsTimed
        ? Math.min(Date.now() - turnStartRef.current, poolMs ?? 999_999)
        : undefined;
      applyOptimisticUci(uci);
      turnStartRef.current = Date.now();
      const telemetry = consumeFairPlayPatch();

      if (isLiveHuman && wsConnected) {
        const sent = wsSendMove(uci, spentMs, telemetry);
        if (sent) return;
      }

      setMovePending(true);
      try {
        const { data } = await gamesApi.move(gameId, uci, {
          includeComments: isVsAi && aiCommentsEnabled,
          spentMs,
          telemetry,
        });
        applyGameResponse(data);
        refreshPendingComments(data, gameId);
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
      isVoteChess,
      isMyTurn,
      isVsAi,
      movePending,
      aiCommentsEnabled,
      isLiveHuman,
      wsConnected,
      wsSendMove,
      applyOptimisticUci,
      applyGameResponse,
      refreshPendingComments,
      gameIsTimed,
      playerIsWhite,
      gameData.white_time_ms,
      gameData.black_time_ms,
      playerIsWhite,
      consumeFairPlayPatch,
      telemetryEnabled,
      t,
    ]
  );

  const findMatch = async () => {
    if (isRated && fairplayConsent !== true && !fairplayExempt) {
      setShowConsentModal(true);
      setStatus(t("fairplay.consent.required"));
      return;
    }
    setSearching(true);
    setStatus(
      useClock
        ? t("play.status.searchTimed", { minutes: TIME_PRESETS[timePreset].statMinutes })
        : t("play.status.searchUnlimited")
    );
    const mmTimeControl = matchmakingTimeControl(useClock, timePreset);
    let httpJoined = false;
    try {
      const { data, status } = await gamesApi.matchmaking(searchMode, {
        is_timed: useClock,
        is_rated: isRated,
        time_control: mmTimeControl,
        variant,
      });
      if (status === 201 && data?.id) {
        handleMatchFound(data.id);
        return;
      }
      httpJoined = status === 200;
    } catch (err: unknown) {
      setStatus(formatApiError(err, t("play.status.searchFailed")));
      setSearching(false);
      return;
    }
    wsSearch({ listenOnly: httpJoined });
  };

  const playGameSection = (
    <>
      <OptionSection compact title={t("play.options.game")} description={t("play.rated.label")}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t("play.rated.label")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={isRated}
              data-testid="play-rated-switch"
              onClick={() => setIsRated((r) => !r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${isRated ? "african-gradient text-white" : "border border-white/20"}`}
            >
              {isRated ? t("play.rated.on") : t("play.rated.off")}
            </button>
          </div>
          <TimeControlPicker
            isTimed={useClock}
            preset={timePreset}
            onTimedChange={setUseClock}
            onPresetChange={setTimePreset}
          />
          {useClock && (
            <p className="text-xs opacity-60" data-testid="play-chosen-time">
              {t("play.time.chosen", {
                clock: timePreset,
                mode: modeLabelText,
              })}
            </p>
          )}
        </div>
      </OptionSection>
      {!gameId && <RecentGamesList limit={8} showTitle />}
    </>
  );

  const playAiSection = (
    <OptionSection compact title={t("play.vsAi.title")} description={t("play.vsAi.hint", { mode: modeLabelText })}>
      {selectedBot && !gameId && (
        <div className="mb-3 p-3 rounded-xl border border-africhess-gold/30 bg-africhess-gold/5">
          <p className="text-xs font-medium text-africhess-gold">
            {t("play.botChallenge.title", {
              name: selectedBotInfo?.name ?? selectedBot,
            })}
          </p>
          <p className="text-[11px] opacity-60 mt-1">{t("play.botChallenge.hint")}</p>
        </div>
      )}
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
        <label className="flex items-center gap-2 text-sm mt-3">
          <input
            type="checkbox"
            checked={blindMode}
            onChange={(e) => setBlindMode(e.target.checked)}
          />
          {t("play.blindMode")}
        </label>
        {blindMode && (
          <p className="text-xs opacity-60 mt-1">{t("play.keyboardHelp")}</p>
        )}
      </div>
      <div className="mb-3 border-t border-white/10 pt-3">
        <TimeControlPicker
          isTimed={useClock}
          preset={timePreset}
          onTimedChange={setUseClock}
          onPresetChange={setTimePreset}
          compact
        />
        {useClock && (
          <p className="text-xs opacity-60 mt-2" data-testid="play-ai-chosen-time">
            {t("play.time.chosen", {
              clock: timePreset,
              mode: modeLabelText,
            })}
          </p>
        )}
      </div>
      {selectedBot ? (
        <div className="mb-3 p-2 rounded-lg border border-africhess-gold/30 text-sm flex items-center gap-3">
          {selectedBotInfo && (
            <span className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 ring-1 ring-africhess-gold/40">
              <Image
                src={getAiAvatarSrc(selectedBotInfo.avatar_id ?? selectedBot)}
                alt={selectedBotInfo.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">
              {selectedBotInfo?.name ?? selectedBot}
              {selectedBotInfo?.elo ? (
                <span className="text-africhess-gold font-mono text-xs ml-2">
                  {selectedBotInfo.elo}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedBot(null);
                setSelectedBotInfo(null);
              }}
              className="text-xs text-africhess-gold hover:underline mt-1"
            >
              {t("play.botClear")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 border-t border-white/10 pt-3">
          <AiStrengthPicker value={aiEloChoice} onChange={setAiEloChoice} />
        </div>
      )}
      <Link href="/bots" className="text-xs text-africhess-gold hover:underline block mb-3">
        {t("play.browseBots")}
      </Link>
      <Link href="/play/vote" className="text-xs text-africhess-gold hover:underline block mb-3">
        {t("vote.createLink")}
      </Link>
      <select
        value={orientation}
        onChange={(e) => setOrientation(e.target.value as "white" | "black")}
        className="w-full mb-3 border rounded-lg px-3 py-2 bg-transparent"
      >
        <option value="white">{t("play.color.white")}</option>
        <option value="black">{t("play.color.black")}</option>
      </select>
      <div className="mb-3 py-2 border-t border-white/10">
        <CommentsToggle />
      </div>
      {selectedBot && (
        <button
          type="button"
          onClick={startAI}
          disabled={aiStarting}
          className="w-full py-2 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
        >
          {aiStarting ? t("common.loading") : t("play.botChallenge.start")}
        </button>
      )}
      {!selectedBot && (
        <p className="text-xs opacity-50">{t("play.cta.useAbove")}</p>
      )}
    </OptionSection>
  );

  const playOnlineSection = (
    <OptionSection compact title={t("play.online.title")}>
      {mmError && <InlineAlert className="mb-3 text-xs">{mmError}</InlineAlert>}
      {searchingPool != null && searchingPool > 0 && !searching && !wsSearching && (
        <p className="text-xs opacity-60 mb-2">
          {t("play.online.searchingPool", { count: searchingPool })}
        </p>
      )}
      <p className="text-xs opacity-50 mb-2">{t("play.cta.useAbove")}</p>
      {(searching || wsSearching) && (
        <button
          type="button"
          onClick={() => {
            wsCancel();
            gamesApi.leaveQueue().catch(() => {});
            setSearching(false);
            setStatus(t("play.status.searchCancelled"));
          }}
          className="w-full py-2 text-sm border border-white/20 rounded-lg opacity-80 hover:opacity-100"
        >
          {t("play.online.cancel")}
        </button>
      )}
    </OptionSection>
  );

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold mb-3">{t("play.title", { mode: modeLabelText })}</h1>
        <p className="mb-6 opacity-70 text-sm">{t("play.guest.benefit")}</p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 african-gradient text-white rounded-xl font-semibold"
        >
          {t("nav.login")}
        </Link>
        <p className="mt-4 text-sm opacity-60">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="text-africhess-gold underline">
            {t("nav.signup")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-8">
      <FairPlayConsentModal
        open={showConsentModal}
        onAccepted={() => {
          setFairplayConsent(true);
          setShowConsentModal(false);
        }}
        onDecline={() => {
          setShowConsentModal(false);
          setIsRated(false);
        }}
      />
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
            <span className="font-medium truncate">{headerAiDisplay.name}</span>
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

      {!gameId && !selectedBot && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={findMatch}
            disabled={searching || wsSearching || aiStarting}
            data-testid="play-find-opponent"
            className="flex-1 py-3 rounded-xl border-2 border-africhess-green text-africhess-green text-sm font-semibold disabled:opacity-50"
          >
            {searching || wsSearching ? t("play.online.searching") : t("play.online.find")}
          </button>
          <button
            type="button"
            onClick={startAI}
            disabled={aiStarting}
            data-testid="play-start-ai"
            className="flex-1 py-3 rounded-xl african-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {aiStarting ? t("common.loading") : t("play.vsAi.start")}
          </button>
        </div>
      )}

      {!gameId && selectedBot && (
        <div className="glass-card p-4 mb-4 border border-africhess-gold/25 space-y-3 lg:hidden">
          <div>
            <h2 className="font-semibold text-sm text-africhess-gold">
              {t("play.botChallenge.title", {
                name: selectedBotInfo?.name ?? selectedBot,
              })}
            </h2>
            <p className="text-xs opacity-60 mt-1">{t("play.botChallenge.hint")}</p>
          </div>
          <button
            type="button"
            onClick={startAI}
            disabled={aiStarting}
            className="w-full py-3 rounded-xl african-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {aiStarting ? t("common.loading") : t("play.botChallenge.start")}
          </button>
        </div>
      )}

      <div className="play-mobile-tabs lg:hidden" role="tablist" aria-label={t("play.mobileTabs")}>
        {mobileTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => {
              setMobileTab(tab);
              if (tab === "setup") {
                requestAnimationFrame(() => {
                  document.getElementById("play-options")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                });
              }
            }}
            className={`play-mobile-tab ${mobileTab === tab ? "play-mobile-tab-active" : "opacity-70"}`}
          >
            {t(`play.mobileTab.${tab}`)}
          </button>
        ))}
      </div>

      {mobileTab === "setup" && (
        <div className="lg:hidden glass-card p-4 mb-4">
          <PlaySetupOptions
            setupCategory={setupCategory}
            onSetupCategoryChange={setSetupCategory}
            gameSection={playGameSection}
            aiSection={playAiSection}
            onlineSection={playOnlineSection}
            status={status ? <p className="text-sm text-africhess-gold">{status}</p> : null}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] gap-4 lg:gap-5 items-start">
        <div className={`w-full min-w-0 max-w-full space-y-3 ${mobileTab !== "board" ? "hidden lg:block" : ""}`}>
          {activeGameId && !gameReady && (
            <p className="text-xs text-center text-africhess-gold animate-pulse">
              {t("common.loading")}
            </p>
          )}
          {isLiveHuman && gameReady && (
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
          {isLiveHuman && gameActive && !isVoteChess && (
            <GamePendingActionsBanner
              myUserId={user?.id}
              drawOfferedBy={gameData.draw_offered_by}
              takebackRequestedBy={gameData.takeback_requested_by}
              whitePlayer={gameData.white_player}
              blackPlayer={gameData.black_player}
              onAcceptDraw={acceptDrawOffer}
              onDeclineDraw={declineDrawOffer}
              onAcceptTakeback={acceptTakebackRequest}
              onDeclineTakeback={declineTakebackRequest}
            />
          )}
          <div className="relative w-full">
            {movePending && isVsAi && (
              <p className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-lg bg-black/75 px-2.5 py-1 text-[11px] text-africhess-gold shadow-lg animate-pulse">
                {t("play.ai.thinking")}
              </p>
            )}
            <AiTauntBubble
              comment={latestAiComment}
              enabled={Boolean(isVsAi && gameId && aiCommentsEnabled)}
            />
            <PlayBoardSection
            fen={gameData.fen}
            moves={gameData.moves}
            orientation={orientation}
            onMove={handleMove}
            onPremove={telemetryEnabled ? notePremove : undefined}
            enablePremoves={telemetryEnabled && isLiveHuman}
            disabled={boardDisabled}
            playerColor={playerColor as "w" | "b"}
            showClock={Boolean(gameId && gameIsTimed)}
            whiteMs={gameData.white_time_ms ?? fallbackBaseMs}
            blackMs={gameData.black_time_ms ?? fallbackBaseMs}
            clockRunning={Boolean(gameActive && gameIsTimed && (isLiveHuman || isMyTurn))}
            incrementMs={gameData.increment_ms ?? 0}
            clockLabel={clockLabel}
            serverValidated={isLiveHuman || activeVariant !== "standard"}
            pendingDrop={activeVariant === "crazyhouse" ? dropPiece : null}
            onDropAtSquare={(uci) => handleMove(uci)}
            onFlag={handleClockFlag}
            topPlayer={topPlayerConfig}
            bottomPlayer={bottomPlayerConfig}
            captured={panelDisplay.captured}
            blindMode={blindMode}
          />
          </div>
          {gameCompleted &&
            isLiveHuman &&
            gameData.is_rated &&
            gameData.rating_changes && (
              <GameOverRatingBanner
                ratingChanges={gameData.rating_changes}
                playerIsWhite={playerIsWhite}
                mode={mode}
                provisional={
                  playerIsWhite
                    ? Boolean(gameData.white_elo_provisional)
                    : Boolean(gameData.black_elo_provisional)
                }
              />
            )}
          {isLiveHuman && gameId && mobileTab === "board" && (
            <button
              type="button"
              onClick={() => setMobileTab("chat")}
              className="lg:hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 bg-black/20 text-sm font-medium hover:border-africhess-gold/40 transition"
            >
              <MessageCircle className="w-4 h-4 text-africhess-gold" aria-hidden />
              {t("play.chat.open")}
            </button>
          )}
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
              moveCount={gameData.move_count}
              result={gameData.result}
              cacheFirst
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
                autoSpeak={!reviewOpen}
              />
            </div>
          )}
          {activeVariant === "crazyhouse" && gameId && isMyTurn && (
            <PocketBar
              pieces={crazyhousePockets}
              selected={dropPiece}
              onSelect={setDropPiece}
              disabled={!gameActive || !isMyTurn}
            />
          )}
          {isVoteChess && gameId && gameActive && (
            <VoteChessPanel
              gameId={gameId}
              fen={gameData.fen}
              canApply={Boolean(isMyTurn)}
              refreshToken={voteRefreshToken}
              wsVote={wsVoteTally}
              onApplied={() => {
                gamesApi.get(gameId).then(({ data }) => applyGameResponse(data)).catch(() => {});
                setVoteRefreshToken((n) => n + 1);
                setStatus("");
              }}
            />
          )}
          {isLiveHuman && gameActive && !isVoteChess && (
            <div className="flex flex-wrap gap-2 justify-center w-full">
              {!gameData.is_rated && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      gameId &&
                      gamesApi
                        .offerTakeback(gameId)
                        .then(({ data }) => {
                          setGameData((prev) => ({
                            ...prev,
                            takeback_requested_by:
                              (data as { requested_by?: number }).requested_by ?? user?.id ?? null,
                          }));
                          setStatus(t("play.takeback.sent"));
                        })
                        .catch((err) => setStatus(formatApiError(err, t("play.error.takeback"))))
                    }
                    className="text-xs px-3 py-1 rounded border border-white/20"
                  >
                    {t("play.takeback.offer")}
                  </button>
                  {gameData.takeback_requested_by &&
                    gameData.takeback_requested_by !== user?.id && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            gameId &&
                            gamesApi
                              .respondTakeback(gameId, true)
                              .then(({ data }) => applyGameResponse(data))
                              .catch((err) =>
                                setStatus(formatApiError(err, t("play.error.takeback")))
                              )
                          }
                          className="text-xs px-3 py-1 rounded border border-africhess-green text-africhess-green"
                        >
                          {t("play.takeback.accept")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            gameId &&
                            gamesApi
                              .respondTakeback(gameId, false)
                              .then(() => {
                                setGameData((prev) => ({ ...prev, takeback_requested_by: null }));
                                setStatus(t("play.takeback.declined"));
                              })
                              .catch((err) =>
                                setStatus(formatApiError(err, t("play.error.takeback")))
                              )
                          }
                          className="text-xs px-3 py-1 rounded border border-white/20"
                        >
                          {t("play.takeback.decline")}
                        </button>
                      </>
                    )}
                </>
              )}
              {(gameData.move_count ?? 0) < 2 && (
                <button
                  type="button"
                  onClick={() =>
                    gameId &&
                    gamesApi
                      .abort(gameId)
                      .then(({ data }) => applyGameResponse(data))
                      .catch((err) => setStatus(formatApiError(err, t("play.error.abort"))))
                  }
                  className="text-xs px-3 py-1 rounded border border-white/20"
                >
                  {t("play.abort")}
                </button>
              )}
              {!gameData.draw_offered_by && (
                <button
                  type="button"
                  onClick={() =>
                    gameId &&
                    gamesApi
                      .offerDraw(gameId)
                      .then(({ data }) => {
                        setGameData((prev) => ({
                          ...prev,
                          draw_offered_by:
                            (data as { offered_by?: number }).offered_by ?? user?.id ?? null,
                        }));
                        setStatus(t("play.draw.sent"));
                      })
                      .catch((err) => setStatus(formatApiError(err, t("play.error.drawOffer"))))
                  }
                  className="text-xs px-3 py-1 rounded border border-white/20"
                >
                  {t("play.draw.offer")}
                </button>
              )}
              {(gameData.threefold_available || gameData.fifty_available) && (
                <button
                  type="button"
                  onClick={claimThreefoldDraw}
                  className="text-xs px-3 py-1 rounded border border-africhess-gold text-africhess-gold"
                >
                  {gameData.fifty_available && !gameData.threefold_available
                    ? t("play.draw.claimFifty")
                    : t("play.draw.claimRepetition")}
                </button>
              )}
              {gameData.draw_offered_by != null &&
                gameData.draw_offered_by !== user?.id && (
                  <>
                    <button
                      type="button"
                      onClick={acceptDrawOffer}
                      className="text-xs px-3 py-1 rounded border border-africhess-green text-africhess-green lg:hidden"
                    >
                      {t("play.draw.accept")}
                    </button>
                    <button
                      type="button"
                      onClick={declineDrawOffer}
                      className="text-xs px-3 py-1 rounded border border-white/20 lg:hidden"
                    >
                      {t("play.draw.decline")}
                    </button>
                  </>
                )}
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(t("play.resign.confirm"))) return;
                  if (!gameId) return;
                  gamesApi
                    .resign(gameId)
                    .then(({ data }) => {
                      applyGameResponse(data);
                      setStatus(t("play.resign.sent"));
                    })
                    .catch((err) => {
                      if (wsConnected) {
                        wsResign();
                        setStatus(t("play.resign.sent"));
                      } else {
                        setStatus(formatApiError(err));
                      }
                    });
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
                  .then((res) => {
                    const { data, status } = res;
                    if (status === 202 || data?.status === "offered") {
                      setStatus(t("play.rematch.offered"));
                      return;
                    }
                    if (data?.id) {
                      setGameId(data.id);
                      syncGameInUrl(data.id, data.mode || mode);
                      applyGameResponse(data);
                      setStatus(t("play.rematch.started"));
                    }
                  })
                  .catch((err) => setStatus(formatApiError(err, t("play.error.rematch"))))
              }
              className="w-full block py-2 text-sm rounded-lg african-gradient text-white"
            >
              {t("play.rematch")}
            </button>
          )}
          {isVsAi && gameActive && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                className="w-full block py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5"
              >
                {t("play.undo.long")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!gameId) return;
                  gamesApi
                    .resign(gameId)
                    .then(({ data }) => {
                      applyGameResponse(data);
                      setStatus(t("play.status.gameEnd", { result: data.result || "—" }));
                    })
                    .catch((err) => setStatus(formatApiError(err)));
                }}
                className="w-full block py-2 text-sm rounded-lg border border-africhess-terracotta text-africhess-terracotta"
              >
                {t("play.resign")}
              </button>
            </>
          )}
        </div>

        <div
          className={`w-full space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin ${
            mobileTab === "board" || mobileTab === "setup" ? "hidden lg:block" : ""
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
          </div>

          {gameId && !isVsAi && (
            <div className={mobileTab === "chat" ? "block" : "hidden lg:block"}>
              <GameChat
                gameId={gameId}
                opponentName={opponentName}
                wsConnected={wsConnected}
                sendChat={wsSendChat}
                subscribeChat={wsSubscribeChat}
                compact={mobileTab === "chat"}
              />
            </div>
          )}

          <div className={mobileTab === "setup" ? "hidden lg:block space-y-4" : "hidden lg:block lg:space-y-4"}>
          <hr className="border-white/10 hidden lg:block" />

          <PlaySetupOptions
            setupCategory={setupCategory}
            onSetupCategoryChange={setSetupCategory}
            gameSection={playGameSection}
            aiSection={playAiSection}
            onlineSection={playOnlineSection}
            status={status ? <p className="text-sm text-africhess-gold">{status}</p> : null}
          />
          </div>
        </div>
      </div>
      {gameEndOverlay && (
        <GameEndOverlay
          outcome={gameEndOverlay.outcome}
          terminationReason={gameEndOverlay.terminationReason}
          result={gameEndOverlay.result}
          onContinue={handleGameEndContinue}
        />
      )}
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
