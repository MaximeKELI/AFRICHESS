import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { type Bot, gamesApi } from "../lib/api";

function botAvatarUri(bot: Bot): string {
  if (bot.avatar_url) return bot.avatar_url;
  const extra = Constants.expoConfig?.extra as { webUrl?: string } | undefined;
  const base = extra?.webUrl ?? "http://10.0.2.2:3000";
  return `${base.replace(/\/$/, "")}/avatars/bots/${bot.avatar_id ?? bot.slug}.png`;
}

export default function BotsScreen() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "legends">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    gamesApi
      .bots({ q: q || undefined, legends: filter === "legends" })
      .then(({ data }) => setBots(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [q, filter]);

  if (loading && bots.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  return (
    <FlatList
      data={bots}
      keyExtractor={(b) => b.slug}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>100 légendes & champions</Text>
          <TextInput
            style={styles.search}
            placeholder="Rechercher…"
            placeholderTextColor="#666"
            value={q}
            onChangeText={setQ}
          />
          <View style={styles.filters}>
            {(["all", "legends"] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterBtn, filter === f && styles.filterActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === "all" ? "Tous" : "Légendes"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Aucun bot trouvé.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Image source={{ uri: botAvatarUri(item) }} style={styles.avatar} />
            <View style={styles.meta}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.elo}>
                {item.elo} ELO
                {item.is_legend ? " · Légende" : ""}
                {item.is_premium ? " · Premium" : ""}
              </Text>
            </View>
          </View>
          <Link href={{ pathname: "/play", params: { bot: item.slug } }} asChild>
            <Pressable style={styles.challenge}>
              <Text style={styles.challengeText}>Défier →</Text>
            </Pressable>
          </Link>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  list: { padding: 16, backgroundColor: "#0D1117" },
  header: { marginBottom: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  search: {
    backgroundColor: "#161B22",
    borderColor: "#30363d",
    borderWidth: 1,
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  filters: { flexDirection: "row", gap: 8, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  filterActive: { borderColor: "#D4A017" },
  filterText: { color: "#888", fontSize: 13 },
  filterTextActive: { color: "#D4A017" },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#161B22",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#30363d" },
  meta: { flex: 1 },
  name: { color: "#fff", fontWeight: "600", fontSize: 16 },
  elo: { color: "#D4A017", fontSize: 13, marginTop: 4 },
  challenge: { marginTop: 10, alignSelf: "flex-start" },
  challengeText: { color: "#1B7A3D", fontWeight: "600" },
});
