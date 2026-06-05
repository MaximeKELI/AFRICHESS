import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import axios from "axios";

const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ?? "http://localhost:8000/api";

interface Bot {
  slug: string;
  name: string;
  elo: number;
  is_premium: boolean;
}

export default function BotsScreen() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<Bot[]>(`${API_URL}/games/bots/`)
      .then(({ data }) => setBots(Array.isArray(data) ? data.slice(0, 30) : []))
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
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.elo}>{item.elo} ELO{item.is_premium ? " · Premium" : ""}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 8 },
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
});
