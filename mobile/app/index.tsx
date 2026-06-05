import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { API_URL, gamesApi } from "../lib/api";

export default function HomeScreen() {
  const { user, loading: authLoading, logout } = useAuth();
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
      <Text style={styles.title}>AFRICHESS</Text>
      <Text style={styles.subtitle}>La maison des échecs d'Afrique — mobile</Text>

      {authLoading ? (
        <ActivityIndicator color="#D4A017" />
      ) : user ? (
        <Text style={styles.stat}>
          Bonjour, {user.display_name || user.username}
          {user.is_premium ? " · Premium" : ""}
        </Text>
      ) : (
        <Text style={styles.stat}>Connectez-vous pour jouer en ligne</Text>
      )}

      {loading ? (
        <ActivityIndicator color="#D4A017" />
      ) : (
        <Text style={styles.stat}>{bots} bots IA disponibles</Text>
      )}

      <View style={styles.links}>
        <Link href={user ? "/play" : "/login"} asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>{user ? "Jouer vs IA" : "Connexion"}</Text>
          </Pressable>
        </Link>
        <Link href="/bots" asChild>
          <Pressable style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>Catalogue bots</Text>
          </Pressable>
        </Link>
        {user && (
          <Pressable style={styles.logoutBtn} onPress={() => logout()}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.hint}>
        API : {API_URL}
        {"\n"}Android émulateur : 10.0.2.2 · iOS : localhost ou IP LAN
      </Text>
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
