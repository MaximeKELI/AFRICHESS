import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { type Bot, gamesApi } from "../lib/api";

export default function BotsScreen() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamesApi
      .bots()
      .then(({ data }) => setBots(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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
      ListEmptyComponent={<Text style={styles.empty}>Aucun bot — vérifiez l'API backend.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.elo}>
            {item.elo} ELO{item.is_premium ? " · Premium" : ""}
          </Text>
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
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#161B22",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  name: { color: "#fff", fontWeight: "600", fontSize: 16 },
  elo: { color: "#D4A017", fontSize: 13, marginTop: 4 },
  challenge: { marginTop: 10, alignSelf: "flex-start" },
  challengeText: { color: "#1B7A3D", fontWeight: "600" },
});
