import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { type GameData, gamesApi } from "../lib/api";

export default function DailyScreen() {
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await gamesApi.correspondence();
      setGames(Array.isArray(data) ? data : []);
    } catch {
      setStatus("Impossible de charger les parties daily.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) void load();
  }, [authLoading, user, load]);

  const seek = async () => {
    setSeeking(true);
    setStatus("");
    try {
      const { data, status: code } = await gamesApi.correspondenceSeek(3);
      if (code === 201 && data.id) {
        router.push({ pathname: "/play", params: { game: data.id } });
        return;
      }
      setStatus("Recherche d'adversaire daily (3 j/coup)…");
      await load();
    } catch {
      setStatus("Impossible de rejoindre la file daily.");
    } finally {
      setSeeking(false);
    }
  };

  const openGame = (game: GameData) => {
    router.push({ pathname: "/play", params: { game: game.id } });
  };

  if (authLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily chess</Text>
      <Text style={styles.subtitle}>Correspondance — 3 jours par coup</Text>

      <Pressable style={styles.btn} onPress={seek} disabled={seeking}>
        {seeking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Chercher une partie</Text>
        )}
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(g) => g.id}
          style={{ marginTop: 16, width: "100%" }}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune partie daily active.</Text>
          }
          renderItem={({ item }) => {
            const opp =
              item.white_player?.id === user.id
                ? item.black_player
                : item.white_player;
            return (
              <Pressable style={styles.row} onPress={() => openGame(item)}>
                <Text style={styles.rowText}>
                  vs {opp?.display_name || opp?.username || "?"}
                </Text>
                <Text style={styles.rowMeta}>{item.status}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0D1117",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#D4A017", marginBottom: 4 },
  subtitle: { color: "#888", marginBottom: 20, textAlign: "center" },
  btn: {
    backgroundColor: "#1B7A3D",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  status: { color: "#aaa", marginTop: 12, textAlign: "center" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
  row: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#30363d",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: { color: "#eee", fontSize: 15 },
  rowMeta: { color: "#888", fontSize: 12 },
});
