import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChessBoard } from "../components/ChessBoard";
import { GameClock } from "../components/GameClock";
import { PocketBar } from "../components/PocketBar";
import { useAuth } from "../context/AuthContext";
import { useGameWebSocket, type WsGamePatch } from "../hooks/useGameWebSocket";
import { useFairPlayTelemetry } from "../hooks/useFairPlayTelemetry";
import { useMatchmakingWebSocket } from "../hooks/useMatchmakingWebSocket";
import { parsePocketsFromFen, pocketForPlayer } from "../lib/crazyhouse";
import { latestComment, pollPendingMoveComments } from "../lib/pollComments";
import { wsPayloadToGameData } from "../lib/gameState";
import { type Bot, type GameData, type GameVariant, gamesApi } from "../lib/api";

const AI_ELOS = [250, 750, 1250, 1750, 2250, 2750, 3250, 4000];
const VARIANTS: { id: GameVariant; label: string }[] = [
  { id: "standard", label: "Classique" },
  { id: "chess960", label: "960" },
  { id: "crazyhouse", label: "Crazy" },
  { id: "kingofthehill", label: "KOTH" },
  { id: "threecheck", label: "3-check" },
];

export default function PlayScreen() {
  const { bot: botSlug, game: gameParam } = useLocalSearchParams<{ bot?: string; game?: string }>();
  const { user, loading: authLoading } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [aiElo, setAiElo] = useState(1250);
  const [color, setColor] = useState<"white" | "black">("white");
  const [playMode, setPlayMode] = useState<"ai" | "human">("ai");
  const [variant, setVariant] = useState<GameVariant>("standard");
  const [activeVariant, setActiveVariant] = useState<GameVariant>("standard");
  const [dropPiece, setDropPiece] = useState<string | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [aiCommentsEnabled, setAiCommentsEnabled] = useState(true);
  const [isRated, setIsRated] = useState(false);
  const [fairplayConsent, setFairplayConsent] = useState<boolean | null>(null);
  const turnStartRef = useRef(Date.now());

  useEffect(() => {
    if (!user || playMode !== "human") return;
    gamesApi
      .fairplayStatus()
      .then(({ data }) => setFairplayConsent(Boolean(data.consent_given)))
      .catch(() => setFairplayConsent(false));
  }, [user, playMode]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user]);

  useEffect(() => {
    gamesApi
      .bots()
      .then(({ data }) => setBots(Array.isArray(data) ? data.slice(0, 20) : []))
      .catch(() => setBots([]))
      .finally(() => setLoadingBots(false));
  }, []);

  useEffect(() => {
    if (!botSlug || typeof botSlug !== "string") return;
    const match = bots.find((b) => b.slug === botSlug);
    if (match) setSelectedBot(match);
  }, [botSlug, bots]);

  useEffect(() => {
    turnStartRef.current = Date.now();
  }, [game?.fen, game?.status]);

  const orientation = color;
  const playerColor = color === "white" ? "w" : "b";
  const turn = useMemo<"w" | "b">(() => {
    if (!game?.fen) return "w";
    return game.fen.includes(" w ") ? "w" : "b";
  }, [game?.fen]);
  const isMyTurn = useMemo(() => {
    if (!game?.fen) return false;
    const activeTurn = game.fen.includes(" w ") ? "w" : "b";
    return activeTurn === playerColor && game.status === "active";
  }, [game, playerColor]);

  const lastMove = useMemo(() => {
    const moves = game?.moves;
    if (!moves?.length) return null;
    const m = moves[moves.length - 1];
    if (m.uci.length < 4) return null;
    return { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) };
  }, [game?.moves]);

  const applyGame = useCallback((data: GameData) => {
    setGame(data);
    if (data.variant) setActiveVariant(data.variant);
    if (data.status === "completed" || data.status === "aborted") {
      setStatus(`Partie terminée : ${data.result ?? "fin"}`);
    }
  }, []);

  useEffect(() => {
    if (!gameParam || typeof gameParam !== "string" || !user) return;
    gamesApi
      .get(gameParam)
      .then(({ data }) => {
        applyGame(data);
        if (data.white_player?.id === user.id) setColor("white");
        else if (data.black_player?.id === user.id) setColor("black");
        setPlayMode("human");
        setStatus("Partie reprise");
      })
      .catch(() => setStatus("Partie introuvable"));
  }, [gameParam, user, applyGame]);

  const refreshComments = useCallback(
    (data: GameData & { comments_pending?: boolean }) => {
      if (!data.id || !data.is_vs_ai || !aiCommentsEnabled || !data.comments_pending) return;
      void pollPendingMoveComments(data.id, applyGame);
    },
    [aiCommentsEnabled, applyGame]
  );

  const aiComment = useMemo(() => latestComment(game?.moves), [game?.moves]);

  const crazyhousePockets = useMemo(() => {
    if (!game || activeVariant !== "crazyhouse") return [];
    return pocketForPlayer(parsePocketsFromFen(game.fen), playerColor);
  }, [game, activeVariant, playerColor]);

  const handleGamePatch = useCallback((patch: WsGamePatch) => {
    setGame((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleWsUpdate = useCallback(
    (payload: Parameters<typeof wsPayloadToGameData>[0]) => {
      applyGame(wsPayloadToGameData(payload));
    },
    [applyGame]
  );

  const handleMatchFound = useCallback(
    async (gameId: string) => {
      setBusy(true);
      try {
        const { data } = await gamesApi.get(gameId);
        applyGame(data);
        if (data.white_player?.id === user?.id) setColor("white");
        else if (data.black_player?.id === user?.id) setColor("black");
        setStatus("Adversaire trouvé !");
      } catch {
        setStatus("Partie introuvable après matchmaking");
      } finally {
        setBusy(false);
      }
    },
    [applyGame, user]
  );

  const { searching, mmError, search: startMatchmaking, cancel: cancelMatchmaking } =
    useMatchmakingWebSocket(
      Boolean(user && playMode === "human"),
      "blitz",
      handleMatchFound,
      { isTimed: true, timeControl: "3+2", isRated, variant }
    );

  const promptFairplayThenSearch = () => {
    if (isRated && fairplayConsent !== true) {
      Alert.alert(
        "Fair Play",
        "Les parties classées nécessitent votre consentement au programme Fair Play (télémétrie anti-triche).",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Partie amicale",
            onPress: () => {
              setIsRated(false);
              void startMatchmaking();
            },
          },
          {
            text: "Accepter",
            onPress: () => {
              void (async () => {
                try {
                  await gamesApi.fairplayConsent();
                  setFairplayConsent(true);
                  void startMatchmaking();
                } catch {
                  setStatus("Impossible d'enregistrer le consentement Fair Play.");
                }
              })();
            },
          },
        ]
      );
      return;
    }
    void startMatchmaking();
  };

  const isLiveHuman = Boolean(game && !game.is_vs_ai && game.status === "active");
  const telemetryEnabled = isLiveHuman && isRated && fairplayConsent === true;
  const { consumePatch: consumeFairPlayPatch } = useFairPlayTelemetry(telemetryEnabled);

  const { connected: wsConnected, wsError, sendMove: wsSendMove, resign: wsResign } = useGameWebSocket(
    game?.id ?? null,
    Boolean(game && game.status === "active"),
    handleWsUpdate,
    (payload) => {
      const data = wsPayloadToGameData(payload);
      setStatus(`Partie terminée : ${data.result ?? payload.reason ?? "fin"}`);
      applyGame(data);
    },
    handleGamePatch
  );

  const startGame = async () => {
    setBusy(true);
    setStatus("");
    try {
      const { data } = await gamesApi.createAI({
        mode: "blitz",
        color,
        ...(selectedBot ? { bot_slug: selectedBot.slug } : { ai_elo: aiElo }),
        variant,
        include_comments: aiCommentsEnabled,
      });
      applyGame(data);
      refreshComments(data);
      const opponent = data.bot?.name ?? selectedBot?.name ?? `IA ${data.ai_target_elo}`;
      setStatus(`Partie vs ${opponent}`);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number } };
      if (ax.response?.status === 403) {
        setStatus("Bot premium — abonnement Gold requis.");
      } else {
        setStatus("Impossible de lancer la partie. Vérifiez la connexion API.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleMove = useCallback(
    async (uci: string) => {
      if (!game || busy || game.status !== "active") return;
      setDropPiece(null);
      setBusy(true);
      const poolMs = playerColor === "w" ? game.white_time_ms : game.black_time_ms;
      const spentMs =
        game.is_timed && poolMs != null
          ? Math.min(Date.now() - turnStartRef.current, poolMs)
          : undefined;
      turnStartRef.current = Date.now();
      try {
        const telemetry = consumeFairPlayPatch();
        const sentWs =
          !game.is_vs_ai &&
          wsSendMove(uci, spentMs, telemetry ?? undefined);
        if (sentWs) {
          return;
        }
        const { data } = await gamesApi.move(game.id, uci, {
          spentMs,
          includeComments: game.is_vs_ai && aiCommentsEnabled,
          telemetry: telemetry ?? undefined,
        });
        applyGame(data);
        refreshComments(data);
      } catch {
        setStatus("Coup refusé — rechargement…");
        const { data } = await gamesApi.get(game.id);
        applyGame(data);
      } finally {
        setBusy(false);
      }
    },
    [game, busy, playerColor, applyGame, aiCommentsEnabled, refreshComments, consumeFairPlayPatch, wsSendMove]
  );

  const handleUndo = async () => {
    if (!game?.is_vs_ai || busy) return;
    setBusy(true);
    try {
      const { data } = await gamesApi.undo(game.id);
      applyGame(data);
      setStatus("Coup annulé");
    } catch {
      setStatus("Impossible d'annuler le coup");
    } finally {
      setBusy(false);
    }
  };

  const confirmResign = () => {
    if (!game || game.status !== "active") return;
    Alert.alert("Abandonner", "Confirmer l'abandon de la partie ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Abandonner",
        style: "destructive",
        onPress: () => {
          if (!game) return;
          gamesApi
            .resign(game.id)
            .then(({ data }) => {
              applyGame(data);
              setStatus("Partie abandonnée");
            })
            .catch(() => {
              if (wsResign()) {
                setStatus("Abandon envoyé…");
              } else {
                setStatus("Impossible d'abandonner");
              }
            });
        },
      },
    ]);
  };

  const handleOfferDraw = async () => {
    if (!game || busy) return;
    setBusy(true);
    try {
      const { data } = await gamesApi.offerDraw(game.id);
      setGame((prev) =>
        prev ? { ...prev, draw_offered_by: data.offered_by ?? user?.id ?? null } : prev
      );
      setStatus("Proposition de nulle envoyée");
    } catch {
      setStatus("Impossible de proposer la nulle");
    } finally {
      setBusy(false);
    }
  };

  const handleRespondDraw = (accept: boolean) => {
    if (!game) return;
    setBusy(true);
    gamesApi
      .respondDraw(game.id, accept)
      .then(({ data }) => {
        applyGame(data);
        setStatus(accept ? "Partie nulle" : "Nulle refusée");
      })
      .catch(() => setStatus("Réponse à la nulle impossible"))
      .finally(() => setBusy(false));
  };

  const handleOfferTakeback = async () => {
    if (!game || busy) return;
    setBusy(true);
    try {
      const { data } = await gamesApi.offerTakeback(game.id);
      setGame((prev) =>
        prev
          ? { ...prev, takeback_requested_by: data.requested_by ?? user?.id ?? null }
          : prev
      );
      setStatus("Demande de reprise envoyée");
    } catch {
      setStatus("Reprise impossible (parties amicales uniquement)");
    } finally {
      setBusy(false);
    }
  };

  const handleRespondTakeback = (accept: boolean) => {
    if (!game) return;
    setBusy(true);
    gamesApi
      .respondTakeback(game.id, accept)
      .then(({ data }) => {
        applyGame(data);
        setStatus(accept ? "Coup repris" : "Reprise refusée");
      })
      .catch(() => setStatus("Réponse à la reprise impossible"))
      .finally(() => setBusy(false));
  };

  const handleAbort = () => {
    if (!game) return;
    Alert.alert("Annuler la partie", "Annuler la partie (2 premiers coups) ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler la partie",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          gamesApi
            .abort(game.id)
            .then(({ data }) => {
              applyGame(data);
              setStatus("Partie annulée");
            })
            .catch(() => setStatus("Annulation impossible"))
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  if (authLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  if (!game) {
    return (
      <ScrollView contentContainerStyle={styles.setup}>
        <Text style={styles.heading}>Jouer</Text>
        <Text style={styles.user}>Connecté : {user.display_name || user.username}</Text>

        <Text style={styles.label}>Mode</Text>
        <View style={styles.row}>
          {(["ai", "human"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setPlayMode(m);
                cancelMatchmaking();
              }}
              style={[styles.chip, playMode === m && styles.chipActive]}
            >
              <Text style={playMode === m ? styles.chipTextActive : styles.chipText}>
                {m === "ai" ? "Vs IA" : "Joueur humain"}
              </Text>
            </Pressable>
          ))}
        </View>

        {playMode === "human" && (
          <>
            <Text style={styles.label}>Variante</Text>
            <View style={styles.row}>
              {VARIANTS.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setVariant(v.id)}
                  style={[styles.chip, variant === v.id && styles.chipActive]}
                >
                  <Text style={variant === v.id ? styles.chipTextActive : styles.chipText}>
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Type de partie</Text>
            <View style={styles.row}>
              {([false, true] as const).map((rated) => (
                <Pressable
                  key={rated ? "rated" : "casual"}
                  onPress={() => setIsRated(rated)}
                  style={[styles.chip, isRated === rated && styles.chipActive]}
                >
                  <Text style={isRated === rated ? styles.chipTextActive : styles.chipText}>
                    {rated ? "Classée" : "Amicale"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.startBtn}
              onPress={promptFairplayThenSearch}
              disabled={busy || searching}
            >
              {searching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.startText}>
                  Chercher un adversaire (blitz {isRated ? "classé" : "amicale"})
                </Text>
              )}
            </Pressable>
            {mmError ? <Text style={styles.status}>{mmError}</Text> : null}
            {searching ? (
              <Pressable onPress={cancelMatchmaking}>
                <Text style={styles.secondaryText}>Annuler la recherche</Text>
              </Pressable>
            ) : null}
          </>
        )}

        {playMode === "ai" && (
          <>
        <Text style={styles.label}>Variante</Text>
        <View style={styles.row}>
          {VARIANTS.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => setVariant(v.id)}
              style={[styles.chip, variant === v.id && styles.chipActive]}
            >
              <Text style={variant === v.id ? styles.chipTextActive : styles.chipText}>
                {v.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Commentaires IA</Text>
        <Pressable
          onPress={() => setAiCommentsEnabled((v) => !v)}
          style={[styles.chip, aiCommentsEnabled && styles.chipActive]}
        >
          <Text style={aiCommentsEnabled ? styles.chipTextActive : styles.chipText}>
            {aiCommentsEnabled ? "Activés" : "Désactivés"}
          </Text>
        </Pressable>

        <Text style={styles.label}>Couleur</Text>
        <View style={styles.row}>
          {(["white", "black"] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.chip, color === c && styles.chipActive]}
            >
              <Text style={color === c ? styles.chipTextActive : styles.chipText}>
                {c === "white" ? "Blancs" : "Noirs"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Force IA (sans bot nommé)</Text>
        <View style={styles.row}>
          {AI_ELOS.map((e) => (
            <Pressable
              key={e}
              onPress={() => {
                setAiElo(e);
                setSelectedBot(null);
              }}
              style={[styles.chip, !selectedBot && aiElo === e && styles.chipActive]}
            >
              <Text
                style={!selectedBot && aiElo === e ? styles.chipTextActive : styles.chipText}
              >
                {e}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Ou choisir un bot</Text>
        {loadingBots ? (
          <ActivityIndicator color="#D4A017" />
        ) : (
          <FlatList
            data={bots}
            keyExtractor={(b) => b.slug}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 48 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedBot(item)}
                style={[styles.botChip, selectedBot?.slug === item.slug && styles.chipActive]}
              >
                <Text
                  style={
                    selectedBot?.slug === item.slug ? styles.chipTextActive : styles.chipText
                  }
                >
                  {item.name.split(" ")[0]} ({item.elo})
                </Text>
              </Pressable>
            )}
          />
        )}

        <Pressable style={styles.startBtn} onPress={startGame} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startText}>Commencer</Text>
          )}
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
          </>
        )}
      </ScrollView>
    );
  }

  const showClock = Boolean(game.is_timed && game.white_time_ms != null && game.black_time_ms != null);

  const opponentName =
    game.white_player?.id === user?.id
      ? game.black_player?.display_name || game.black_player?.username
      : game.white_player?.display_name || game.white_player?.username;
  const opponentOfferedDraw =
    !game.is_vs_ai &&
    game.draw_offered_by != null &&
    game.draw_offered_by !== user?.id;
  const opponentRequestedTakeback =
    !game.is_vs_ai &&
    game.takeback_requested_by != null &&
    game.takeback_requested_by !== user?.id;
  const canAbort =
    !game.is_vs_ai && game.status === "active" && (game.move_count ?? 0) <= 2;

  return (
    <ScrollView contentContainerStyle={styles.game}>
      <Text style={styles.status}>{status}</Text>
      {!game.is_vs_ai && opponentName ? (
        <Text style={styles.opponent}>vs {opponentName}</Text>
      ) : null}
      <Text style={styles.wsStatus}>
        {wsConnected ? "● Temps réel connecté" : wsError ?? "Connexion temps réel…"}
      </Text>
      {showClock && (
        <GameClock
          whiteMs={game.white_time_ms!}
          blackMs={game.black_time_ms!}
          turn={turn}
          running={game.status === "active"}
          orientation={orientation}
          incrementMs={game.increment_ms ?? 0}
        />
      )}
      {aiComment ? (
        <Text style={styles.commentBox}>🤖 {aiComment}</Text>
      ) : null}
      {busy && <ActivityIndicator color="#D4A017" style={{ marginBottom: 8 }} />}
      {activeVariant === "crazyhouse" && game.status === "active" && isMyTurn && (
        <PocketBar
          pieces={crazyhousePockets}
          selected={dropPiece}
          onSelect={setDropPiece}
          disabled={busy}
        />
      )}
      <ChessBoard
        fen={game.fen}
        orientation={orientation}
        playerColor={playerColor}
        disabled={!isMyTurn || busy || game.status !== "active"}
        lastMove={lastMove}
        serverValidated={activeVariant !== "standard"}
        pendingDrop={activeVariant === "crazyhouse" ? dropPiece : null}
        onDropAtSquare={handleMove}
        onMove={handleMove}
      />
      <View style={styles.gameActions}>
        {opponentOfferedDraw && (
          <View style={styles.offerRow}>
            <Text style={styles.offerText}>L'adversaire propose la nulle</Text>
            <View style={styles.row}>
              <Pressable style={styles.secondaryBtn} onPress={() => handleRespondDraw(true)}>
                <Text style={styles.secondaryText}>Accepter</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => handleRespondDraw(false)}>
                <Text style={styles.secondaryText}>Refuser</Text>
              </Pressable>
            </View>
          </View>
        )}
        {opponentRequestedTakeback && (
          <View style={styles.offerRow}>
            <Text style={styles.offerText}>L'adversaire demande une reprise</Text>
            <View style={styles.row}>
              <Pressable style={styles.secondaryBtn} onPress={() => handleRespondTakeback(true)}>
                <Text style={styles.secondaryText}>Accepter</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => handleRespondTakeback(false)}>
                <Text style={styles.secondaryText}>Refuser</Text>
              </Pressable>
            </View>
          </View>
        )}
        {!game.is_vs_ai && game.status === "active" && !game.draw_offered_by && (
          <Pressable style={styles.secondaryBtn} onPress={handleOfferDraw} disabled={busy}>
            <Text style={styles.secondaryText}>Proposer nulle</Text>
          </Pressable>
        )}
        {!game.is_vs_ai && !game.is_rated && game.status === "active" && !game.takeback_requested_by && (
          <Pressable style={styles.secondaryBtn} onPress={handleOfferTakeback} disabled={busy}>
            <Text style={styles.secondaryText}>Demander reprise</Text>
          </Pressable>
        )}
        {canAbort && (
          <Pressable style={styles.secondaryBtn} onPress={handleAbort} disabled={busy}>
            <Text style={styles.secondaryText}>Annuler partie</Text>
          </Pressable>
        )}
        {game.is_vs_ai && game.status === "active" && (
          <Pressable style={styles.secondaryBtn} onPress={handleUndo} disabled={busy}>
            <Text style={styles.secondaryText}>Annuler coup</Text>
          </Pressable>
        )}
        {game.status === "active" && (
          <Pressable style={[styles.secondaryBtn, styles.dangerBtn]} onPress={confirmResign}>
            <Text style={styles.dangerText}>Abandonner</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            setGame(null);
            setStatus("");
            setActiveVariant("standard");
            setDropPiece(null);
          }}
        >
          <Text style={styles.secondaryText}>Nouvelle partie</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  setup: { padding: 20, backgroundColor: "#0D1117", flexGrow: 1 },
  game: { padding: 16, backgroundColor: "#0D1117", alignItems: "center" },
  heading: { fontSize: 24, fontWeight: "700", color: "#D4A017", marginBottom: 8 },
  user: { color: "#888", marginBottom: 20 },
  label: { color: "#aaa", fontSize: 13, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  chipActive: { backgroundColor: "#1B7A3D", borderColor: "#D4A017" },
  chipText: { color: "#ccc", fontSize: 13 },
  chipTextActive: { color: "#fff", fontSize: 13, fontWeight: "600" },
  botChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    marginRight: 8,
  },
  startBtn: {
    backgroundColor: "#1B7A3D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 28,
  },
  startText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  status: { color: "#aaa", textAlign: "center", marginBottom: 4, fontSize: 14 },
  opponent: { color: "#ccc", textAlign: "center", marginBottom: 8, fontSize: 13 },
  offerRow: { marginBottom: 10, alignItems: "center", gap: 8 },
  offerText: { color: "#D4A017", fontSize: 13, textAlign: "center" },
  wsStatus: { color: "#666", textAlign: "center", marginBottom: 12, fontSize: 11 },
  commentBox: {
    color: "#ddd",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 12,
    fontStyle: "italic",
  },
  gameActions: { marginTop: 20, width: "100%", gap: 10 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#D4A017",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#D4A017", fontWeight: "600" },
  dangerBtn: { borderColor: "#E07A5F" },
  dangerText: { color: "#E07A5F", fontWeight: "600" },
});
