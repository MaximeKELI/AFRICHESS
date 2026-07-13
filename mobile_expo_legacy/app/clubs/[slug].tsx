import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { socialApi } from "../../lib/api";

interface ClubDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
  is_member?: boolean;
  owner?: { username: string; display_name?: string };
}

export default function ClubDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!slug) return;
    socialApi
      .club(slug)
      .then(({ data }) => setClub(data as ClubDetail))
      .catch(() => setStatus(t("clubs.error.load")))
      .finally(() => setLoading(false));
  }, [user, slug, t]);

  const join = async () => {
    if (!slug) return;
    try {
      await socialApi.joinClub(slug);
      setClub((c) => (c ? { ...c, is_member: true } : c));
      setStatus(t("clubs.member"));
    } catch {
      setStatus(t("clubs.error.join"));
    }
  };

  if (loading || !club) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{club.name}</Text>
      <Text style={styles.meta}>
        {club.country} · {club.member_count} {t("clubs.members")}
      </Text>
      {club.owner ? (
        <Text style={styles.meta}>
          {t("clubs.owner")}: {club.owner.display_name || club.owner.username}
        </Text>
      ) : null}
      <Text style={styles.desc}>{club.description || t("clubs.noDescription")}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {!club.is_member ? (
        <Pressable style={styles.btn} onPress={() => void join()}>
          <Text style={styles.btnText}>{t("clubs.join")}</Text>
        </Pressable>
      ) : (
        <Text style={styles.member}>{t("clubs.member")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  container: { padding: 16, backgroundColor: "#0D1117", gap: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#D4A017" },
  meta: { color: "#888", fontSize: 13 },
  desc: { color: "#ccc", lineHeight: 22, marginTop: 8 },
  status: { color: "#aaa", fontSize: 13 },
  btn: { backgroundColor: "#1B7A3D", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  member: { color: "#1B7A3D", fontWeight: "700", marginTop: 8 },
});
