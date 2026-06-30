import { useState } from "react";
import { Link, router } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LoginError, useAuth } from "../context/AuthContext";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onOAuth = async (provider: "google" | "github") => {
    setError("");
    setLoading(true);
    try {
      await loginWithOAuth(provider);
      router.replace("/play");
    } catch (err) {
      if (err instanceof LoginError && err.code === "TOTP_REQUIRED") {
        router.push("/auth/callback");
        return;
      }
      setError("Connexion OAuth annulée ou indisponible.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password, needsTotp ? totpCode : undefined);
      router.replace("/play");
    } catch (err) {
      if (err instanceof LoginError && err.code === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setError("Code 2FA requis (application d'authentification).");
        return;
      }
      setError("Identifiants incorrects ou serveur indisponible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
        placeholderTextColor="#666"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {needsTotp && (
        <TextInput
          style={styles.input}
          placeholder="Code 2FA (6 chiffres)"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={6}
          value={totpCode}
          onChangeText={(v) => setTotpCode(v.replace(/\D/g, "").slice(0, 6))}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Se connecter</Text>
        )}
      </Pressable>
      <View style={styles.oauthRow}>
        <Pressable style={styles.oauthBtn} onPress={() => void onOAuth("google")} disabled={loading}>
          <Text style={styles.oauthText}>Google</Text>
        </Pressable>
        <Pressable style={styles.oauthBtn} onPress={() => void onOAuth("github")} disabled={loading}>
          <Text style={styles.oauthText}>GitHub</Text>
        </Pressable>
      </View>
      <Link href="/register" style={styles.link}>
        <Text style={styles.linkText}>Créer un compte</Text>
      </Link>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Retour</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#0D1117",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#D4A017",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    color: "#fff",
    backgroundColor: "#161B22",
  },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  oauthRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  oauthBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D4A017",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  oauthText: { color: "#D4A017", fontWeight: "600" },
  error: { color: "#E07A5F", marginBottom: 8, textAlign: "center" },
  link: { marginTop: 20, alignSelf: "center" },
  linkText: { color: "#D4A017" },
});
