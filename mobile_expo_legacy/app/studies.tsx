import { useEffect, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { learningApi, type StudySummary } from "../lib/api";

export default function StudiesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [list, setList] = useState<StudySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    learningApi
      .studies()
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t("studies.loginRequired")}</Text>
        <Link href="/login" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>{t("app.login")}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("studies.title")}</Text>
      {loading ? (
        <ActivityIndicator color="#D4A017" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.muted}>{t("studies.empty")}</Text>}
          renderItem={({ item }) => (
            <Link href={`/studies/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.muted}>
                  {item.owner} · {item.chapter_count} ch.
                </Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0D1117" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#D4A017", marginBottom: 12 },
  muted: { color: "#888", fontSize: 13 },
  card: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#161b22",
  },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
  btn: {
    backgroundColor: "#1B7A3D",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
