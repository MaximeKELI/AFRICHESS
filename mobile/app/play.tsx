import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChessBoard } from "../components/ChessBoard";
import { GameClock } from "../components/GameClock";
import { useAuth } from "../context/AuthContext";
import { type Bot, type GameData, gamesApi } from "../lib/api";

const AI_ELOS = [750, 1250, 1750, 2250, 2750, 3250];

export default function PlayScreen() {
  const { bot: botSlug } = useLocalSearchParams<{ bot?: string }>();
  const { user, loading: authLoading } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [aiElo, setAiElo] = useState(1250);
  const [color, setColor] = useState<"white" | "black">("white");
  const [game, setGame] = useState<GameData | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);

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

  const orientation = color;
  const playerColor = color === "white" ? "w" : "b";
  const turn = useMemo<"w" | "b">(() => {
    if (!game?.fen) return "w";
    return game.fen.includes(" w ") ? "w" : "b";
  }, [game?.fen]);
  const isMyTurn = useMemo(() => {
    if (!game?.fen) return false;
    const turn = game.fen.includes(" w ") ? "w" : "b";
    return turn === playerColor && game.status === "active";
  }, [game, playerColor]);

  const lastMove = useMemo(() => {
    const moves = game?.moves;
    if (!moves?.length) return null;
    const m = moves[moves.length - 1];
    if (m.uci.length < 4) return null;
    return { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) };
  }, [game?.moves]);

  const startGame = async () => {
    setBusy(true);
    setStatus("");
    try {
      const { data } = await gamesApi.createAI({
        mode: "blitz",
        color,
        ...(selectedBot ? { bot_slug: selectedBot.slug } : { ai_elo: aiElo }),
        variant: "standard",
      });
      setGame(data);
      const opponent = data.bot?.name ?? selectedBot?.name ?? `IA ${data.ai_target_elo}`;
      setStatus(`Partie vs ${opponent}`);
    } catch {
      setStatus("Impossible de lancer la partie. Vérifiez la connexion API.");
    } finally {
      setBusy(false);
    }
  };

  const handleMove = useCallback(
    async (uci: string) => {
      if (!game || busy || game.status !== "active") return;
      setBusy(true);
      try {
        const { data } = await gamesApi.move(game.id, uci);
        setGame(data);
        if (data.status === "completed") {
          setStatus(`Partie terminée : ${data.result ?? "fin"}`);
        }
      } catch {
        setStatus("Coup refusé — rechargement…");
        const { data } = await gamesApi.get(game.id);
        setGame(data);
      } finally {
        setBusy(false);
      }
    },
    [game, busy]
  );

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
        <Text style={styles.heading}>Jouer vs IA</Text>
        <Text style={styles.user}>Connecté : {user.display_name || user.username}</Text>

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
      </ScrollView>
    );
  }

  const showClock = Boolean(game.is_timed && game.white_time_ms != null && game.black_time_ms != null);

  return (
    <ScrollView contentContainerStyle={styles.game}>
      <Text style={styles.status}>{status}</Text>
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
      {busy && <ActivityIndicator color="#D4A017" style={{ marginBottom: 8 }} />}
      <ChessBoard
        fen={game.fen}
        orientation={orientation}
        playerColor={playerColor}
        disabled={!isMyTurn || busy || game.status !== "active"}
        lastMove={lastMove}
        onMove={handleMove}
      />
      <View style={styles.gameActions}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            setGame(null);
            setStatus("");
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
  status: { color: "#aaa", textAlign: "center", marginBottom: 12, fontSize: 14 },
  gameActions: { marginTop: 20, width: "100%" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#D4A017",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#D4A017", fontWeight: "600" },
});
