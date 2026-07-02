import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChessBoard } from "../../components/ChessBoard";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { gamesApi, type GameData } from "../../lib/api";

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [game, setGame] = useState<GameData | null>(null);
  const [ply, setPly] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    gamesApi
      .get(id)
      .then(({ data }) => setGame(data))
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  const reviewFen = useMemo(() => {
    if (!game?.moves?.length) return game?.fen ?? "start";
    const idx = Math.min(ply, game.moves.length) - 1;
    if (ply <= 0) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    return game.moves[idx]?.fen_after ?? game.fen;
  }, [game, ply]);

  const lastMove = useMemo(() => {
    if (!game?.moves?.length || ply <= 0) return null;
    const m = game.moves[Math.min(ply, game.moves.length) - 1];
    if (!m?.uci || m.uci.length < 4) return null;
    return { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) };
  }, [game, ply]);

  const step = useCallback(
    (delta: number) => {
      if (!game?.moves) return;
      setPly((p) => Math.max(0, Math.min(game.moves!.length, p + delta)));
    },
    [game]
  );

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t("review.loginRequired")}</Text>
        <Link href="/login" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>{t("app.login")}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t("review.notFound")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("review.title")}</Text>
      <Text style={styles.muted}>
        {game.white_player?.username} vs {game.black_player?.username} · {game.result}
      </Text>
      <View style={styles.boardWrap}>
        <ChessBoard
          fen={reviewFen}
          orientation="white"
          disabled
          lastMove={lastMove}
          serverValidated={game.variant !== "standard"}
        />
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.ctrlBtn} onPress={() => setPly(0)}>
          <Text style={styles.ctrlText}>|◀</Text>
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={() => step(-1)}>
          <Text style={styles.ctrlText}>◀</Text>
        </Pressable>
        <Text style={styles.ply}>
          {ply}/{game.moves?.length ?? 0}
        </Text>
        <Pressable style={styles.ctrlBtn} onPress={() => step(1)}>
          <Text style={styles.ctrlText}>▶</Text>
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={() => setPly(game.moves?.length ?? 0)}>
          <Text style={styles.ctrlText}>▶|</Text>
        </Pressable>
      </View>
      <Link href={`/play?game=${game.id}`} asChild>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>{t("review.openGame")}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#0D1117", alignItems: "center", gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24, backgroundColor: "#0D1117" },
  title: { fontSize: 20, fontWeight: "700", color: "#D4A017" },
  muted: { color: "#888", fontSize: 13 },
  boardWrap: { width: "100%", maxWidth: 360 },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctrlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  ctrlText: { color: "#fff", fontSize: 16 },
  ply: { color: "#aaa", minWidth: 48, textAlign: "center" },
  btn: {
    backgroundColor: "#1B7A3D",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
