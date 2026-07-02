import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { API_URL, gamesApi } from "../lib/api";

export default function HomeScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [bots, setBots] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamesApi
      .bots()
      .then(({ data }) => setBots(Array.isArray(data) ? data.length : 0))
      .catch(() => setBots(0))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("app.title")}</Text>
      <Text style={styles.subtitle}>{t("app.subtitle")}</Text>

      <View style={styles.langRow}>
        <Text style={styles.langLabel}>{t("app.language")}</Text>
        {(["fr", "en"] as const).map((code) => (
          <Pressable
            key={code}
            onPress={() => setLocale(code)}
            style={[styles.langBtn, locale === code && styles.langBtnActive]}
          >
            <Text style={locale === code ? styles.langTextActive : styles.langText}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {authLoading ? (
        <ActivityIndicator color="#D4A017" />
      ) : user ? (
        <Text style={styles.stat}>
          {t("app.hello", { name: user.display_name || user.username })}
          {user.is_premium ? ` · ${t("app.premium")}` : ""}
        </Text>
      ) : (
        <Text style={styles.stat}>{t("app.loginPrompt")}</Text>
      )}

      {loading ? (
        <ActivityIndicator color="#D4A017" />
      ) : (
        <Text style={styles.stat}>{t("app.botsAvailable", { count: bots })}</Text>
      )}

      <View style={styles.links}>
        <Link href={user ? "/play" : "/login"} asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>{user ? t("app.playAi") : t("app.login")}</Text>
          </Pressable>
        </Link>
        <Link href="/bots" asChild>
          <Pressable style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>{t("app.botCatalog")}</Text>
          </Pressable>
        </Link>
        {user && (
          <Link href="/premium" asChild>
            <Pressable style={[styles.btn, styles.btnOutline]}>
              <Text style={styles.btnTextOutline}>{t("app.premium")}</Text>
            </Pressable>
          </Link>
        )}
        {user && (
          <Link href="/daily" asChild>
            <Pressable style={[styles.btn, styles.btnOutline]}>
              <Text style={styles.btnTextOutline}>{t("app.dailyChess")}</Text>
            </Pressable>
          </Link>
        )}
        {user && (
          <Link href="/leaderboard" asChild>
            <Pressable style={[styles.btn, styles.btnOutline]}>
              <Text style={styles.btnTextOutline}>{t("app.leaderboard")}</Text>
            </Pressable>
          </Link>
        )}
        {user && (
          <Link href="/clubs" asChild>
            <Pressable style={[styles.btn, styles.btnOutline]}>
              <Text style={styles.btnTextOutline}>{t("app.clubs")}</Text>
            </Pressable>
          </Link>
        )}
        {user && (
          <Link href="/friends" asChild>
            <Pressable style={[styles.btn, styles.btnOutline]}>
              <Text style={styles.btnTextOutline}>{t("app.friends")}</Text>
            </Pressable>
          </Link>
        )}
        <Link href="/puzzles" asChild>
          <Pressable style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>{t("app.puzzles")}</Text>
          </Pressable>
        </Link>
        <Link href="/learning" asChild>
          <Pressable style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>{t("app.learning")}</Text>
          </Pressable>
        </Link>
        <Link href="/tournaments" asChild>
          <Pressable style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>{t("app.tournaments")}</Text>
          </Pressable>
        </Link>
        {user && (
          <Pressable style={styles.logoutBtn} onPress={() => logout()}>
            <Text style={styles.logoutText}>{t("app.logout")}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.hint}>{t("app.apiHint", { url: API_URL })}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#D4A017",
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
  },
  langRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  langLabel: { color: "#888", fontSize: 13 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  langBtnActive: { backgroundColor: "#1B7A3D", borderColor: "#D4A017" },
  langText: { color: "#aaa", fontWeight: "600" },
  langTextActive: { color: "#fff", fontWeight: "700" },
  stat: {
    color: "#1B7A3D",
    fontSize: 14,
  },
  links: { width: "100%", gap: 12, marginTop: 24 },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#D4A017",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextOutline: { color: "#D4A017", fontWeight: "700", fontSize: 16 },
  logoutBtn: { padding: 12, alignItems: "center" },
  logoutText: { color: "#888", fontSize: 14 },
  hint: {
    marginTop: 32,
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
});
