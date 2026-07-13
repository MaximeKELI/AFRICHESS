import { useCallback, useEffect, useState } from "react";
import { Link, router } from "expo-router";
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
import { socialApi } from "../lib/api";

interface ClubRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
  is_member?: boolean;
}

export default function ClubsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    socialApi
      .clubs()
      .then(({ data }) => setClubs(Array.isArray(data) ? data : []))
      .catch(() => setStatus(t("clubs.error.load")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    load();
  }, [user, load]);

  const join = async (slug: string) => {
    try {
      await socialApi.joinClub(slug);
      setStatus(t("clubs.member"));
      load();
    } catch {
      setStatus(t("clubs.error.join"));
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("clubs.title")}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#D4A017" />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(c) => String(c.id)}
          ListEmptyComponent={<Text style={styles.empty}>{t("clubs.empty")}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/clubs/${item.slug}`)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.country} · {item.member_count} {t("clubs.members")}
                </Text>
                {item.description ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </Pressable>
              {!item.is_member ? (
                <Pressable style={styles.joinBtn} onPress={() => void join(item.slug)}>
                  <Text style={styles.joinText}>{t("clubs.join")}</Text>
                </Pressable>
              ) : (
                <Text style={styles.member}>{t("clubs.member")}</Text>
              )}
            </View>
          )}
        />
      )}
      <Link href="/" style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  container: { flex: 1, padding: 16, backgroundColor: "#0D1117" },
  title: { fontSize: 24, fontWeight: "800", color: "#D4A017", marginBottom: 12 },
  status: { color: "#aaa", marginBottom: 8, fontSize: 13 },
  card: {
    backgroundColor: "#161B22",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 8,
  },
  name: { color: "#fff", fontWeight: "700", fontSize: 16 },
  meta: { color: "#888", fontSize: 12 },
  desc: { color: "#aaa", fontSize: 13 },
  joinBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#1B7A3D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinText: { color: "#fff", fontWeight: "600" },
  member: { color: "#1B7A3D", fontWeight: "600", fontSize: 13 },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
  back: { alignSelf: "center", marginTop: 16 },
  backText: { color: "#D4A017", fontSize: 18 },
});
