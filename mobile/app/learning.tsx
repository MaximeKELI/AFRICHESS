import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../context/LocaleContext";
import { type CourseSummary, type VideoSummary, learningApi } from "../lib/api";

export default function LearningScreen() {
  const { t, locale } = useTranslation();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      learningApi.courses(locale).then(({ data }) => setCourses(Array.isArray(data) ? data : [])),
      learningApi.videos().then(({ data }) => setVideos(Array.isArray(data) ? data : [])),
    ]).catch(() => setError(t("learning.error"))).finally(() => setLoading(false));
  }, [locale, t]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("learning.title")}</Text>
      <Text style={styles.subtitle}>{t("learning.subtitle")}</Text>

      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <Text style={styles.section}>{t("learning.courses")}</Text>
          {courses.length === 0 ? (
            <Text style={styles.empty}>{t("learning.empty")}</Text>
          ) : (
            courses.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardMeta}>
                  {c.level} · {c.lesson_count} leçons · {c.xp_reward} XP
                </Text>
                {c.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {c.description}
                  </Text>
                ) : null}
              </View>
            ))
          )}

          <Text style={[styles.section, { marginTop: 24 }]}>{t("learning.videos")}</Text>
          {videos.length === 0 ? (
            <Text style={styles.empty}>{t("learning.empty")}</Text>
          ) : (
            videos.map((v) => (
              <View key={v.id} style={styles.card}>
                <Text style={styles.cardTitle}>{v.title}</Text>
                {v.is_premium ? (
                  <Text style={styles.premium}>{t("learning.premium")}</Text>
                ) : null}
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#0D1117", flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "800", color: "#D4A017", marginBottom: 4 },
  subtitle: { color: "#aaa", marginBottom: 16 },
  section: { color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 8 },
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
  premium: { color: "#D4A017", fontSize: 12, marginTop: 4 },
  empty: { color: "#666", fontStyle: "italic", marginBottom: 12 },
  error: { color: "#E07A5F", marginTop: 16, textAlign: "center" },
});
