import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../context/LocaleContext";
import { type LeaderboardEntry, ratingsApi } from "../lib/api";

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"african" | "global">("african");
  const [mode, setMode] = useState("blitz");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = tab === "global" ? ratingsApi.globalLeaderboard : ratingsApi.africanLeaderboard;
    fetcher(mode)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : data.results ?? [];
        setEntries(rows);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab, mode]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("leaderboard.title")}</Text>
      <View style={styles.row}>
        {(["african", "global"] as const).map((key) => (
          <Pressable
            key={key}
            style={[styles.chip, tab === key && styles.chipActive]}
            onPress={() => setTab(key)}
          >
            <Text style={tab === key ? styles.chipTextActive : styles.chipText}>
              {t(key === "african" ? "leaderboard.african" : "leaderboard.global")}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {["bullet", "blitz", "rapid"].map((m) => (
          <Pressable key={m} style={[styles.chip, mode === m && styles.chipActive]} onPress={() => setMode(m)}>
            <Text style={mode === m ? styles.chipTextActive : styles.chipText}>{m}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => `${item.user.username}-${i}`}
          ListEmptyComponent={<Text style={styles.empty}>{t("leaderboard.empty")}</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.user.display_name || item.user.username}</Text>
                <Text style={styles.meta}>
                  {item.user.country} · {item.games_count} {t("leaderboard.games")}
                </Text>
              </View>
              <Text style={styles.elo}>{item.elo}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0D1117" },
  title: { fontSize: 24, fontWeight: "800", color: "#D4A017", marginBottom: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#30363d" },
  chipActive: { backgroundColor: "#1B7A3D", borderColor: "#D4A017" },
  chipText: { color: "#aaa", fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: "#fff", fontWeight: "700", textTransform: "capitalize" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#161B22",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  rank: { color: "#888", width: 28, fontWeight: "700" },
  flex: { flex: 1 },
  name: { color: "#fff", fontWeight: "600" },
  meta: { color: "#666", fontSize: 12 },
  elo: { color: "#D4A017", fontWeight: "800", fontSize: 16 },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
});
