import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../context/LocaleContext";
import { type TournamentSummary, tournamentsApi } from "../lib/api";

function statusLabel(status: string, t: (k: string) => string): string {
  if (status === "registration") return t("tournaments.open");
  if (status === "active" || status === "in_progress") return t("tournaments.live");
  return status;
}

export default function TournamentsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    tournamentsApi
      .list()
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError(t("tournaments.error")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("tournaments.title")}</Text>
      <Text style={styles.subtitle}>{t("tournaments.subtitle")}</Text>

      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>{t("tournaments.empty")}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {statusLabel(item.status, t)} · {item.format} · {item.participant_count} joueurs
            </Text>
            {item.is_african_cup ? (
              <Text style={styles.badge}>African Cup</Text>
            ) : null}
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#0D1117", flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "800", color: "#D4A017", marginBottom: 4 },
  subtitle: { color: "#aaa", marginBottom: 16 },
  card: {
    backgroundColor: "#161B22",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cardMeta: { color: "#888", fontSize: 12, marginTop: 4 },
  cardDesc: { color: "#aaa", fontSize: 13, marginTop: 6 },
  badge: { color: "#1B7A3D", fontSize: 12, marginTop: 4, fontWeight: "600" },
  empty: { color: "#666", fontStyle: "italic", marginTop: 16 },
  error: { color: "#E07A5F", marginTop: 16, textAlign: "center" },
});
