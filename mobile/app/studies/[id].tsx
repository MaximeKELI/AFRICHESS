import { useEffect, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "../context/LocaleContext";
import { learningApi, type StudyChapter, type StudyDetail } from "../lib/api";

export default function StudyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [chapter, setChapter] = useState<StudyChapter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    learningApi
      .studyDetail(Number(id))
      .then(({ data }) => {
        setStudy(data);
        setChapter(data.chapters[0] ?? null);
      })
      .catch(() => setStudy(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  if (!study) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t("studies.notFound")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link href="/studies" asChild>
        <Pressable>
          <Text style={styles.link}>← {t("studies.title")}</Text>
        </Pressable>
      </Link>
      <Text style={styles.title}>{study.title}</Text>
      <View style={styles.chapters}>
        {study.chapters.map((ch) => (
          <Pressable
            key={ch.id}
            onPress={() => setChapter(ch)}
            style={[styles.chip, chapter?.id === ch.id && styles.chipActive]}
          >
            <Text style={chapter?.id === ch.id ? styles.chipTextActive : styles.chipText}>
              {ch.title}
            </Text>
          </Pressable>
        ))}
      </View>
      {chapter && (
        <View style={styles.pgnBox}>
          <Text style={styles.pgnLabel}>{chapter.title}</Text>
          <Text style={styles.pgn} selectable>
            {chapter.pgn || t("studies.emptyPgn")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#0D1117", flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  link: { color: "#D4A017", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 12 },
  muted: { color: "#888" },
  chapters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  chipActive: { borderColor: "#D4A017", backgroundColor: "rgba(212,160,23,0.15)" },
  chipText: { color: "#aaa", fontSize: 12 },
  chipTextActive: { color: "#D4A017", fontSize: 12 },
  pgnBox: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#161b22",
  },
  pgnLabel: { color: "#D4A017", fontWeight: "600", marginBottom: 8 },
  pgn: { color: "#ccc", fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
});
